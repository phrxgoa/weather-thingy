import { useState, useEffect, useCallback, useRef } from 'react';

interface GeolocationState {
  coordinates: { lat: number; lon: number } | null;
  error: string | null;
  loading: boolean;
  permissionGranted: boolean | null; // null = not asked, true = granted, false = denied
  permissionState: string | null; // Raw permission state from the Permissions API
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    error: null,
    loading: false,
    permissionGranted: null,
    permissionState: null,
  });

  // Track if we're using Firefox
  const isFirefoxRef = useRef(false);

  // Track attempts to get location
  const attemptCountRef = useRef(0);

  // Initialize Firefox detection and check secure context on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof window !== 'undefined') {
      // Check if we're in a secure context (HTTPS)
      const isSecure = window.isSecureContext;
      console.log('Secure context check:', isSecure);

      if (!isSecure) {
        console.warn('Geolocation API requires a secure context (HTTPS). Location services may not work.');
      }

      // Detect Firefox
      isFirefoxRef.current = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
      console.log('Browser detection initialized. Is Firefox:', isFirefoxRef.current);
    }
  }, []);

  // Function to request geolocation permission
  const requestGeolocation = useCallback(() => {
    console.log('Requesting geolocation permission... Attempt #', attemptCountRef.current + 1);
    attemptCountRef.current += 1;

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        permissionGranted: false,
        loading: false,
        permissionState: 'unsupported'
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    // For testing purposes, use a hardcoded location if we get an error
    const useFallbackLocation = (errorMessage: string) => {
      console.log('Using fallback location due to error:', errorMessage);
      // New York coordinates as fallback
      const fallbackCoords = { lat: 40.7128, lon: -74.0060 };

      setState({
        coordinates: fallbackCoords,
        error: `${errorMessage} Using default location instead.`,
        loading: false,
        permissionGranted: true, // Treat fallback as a successful location retrieval for display purposes
        permissionState: 'fallback',
      });
    };

    // Firefox-specific detection
    const isFirefox = isFirefoxRef.current;
    console.log('Is Firefox browser:', isFirefox);

    // Geolocation options - following MDN recommendations
    // Use different options for Firefox vs other browsers
    const geoOptions = {
      enableHighAccuracy: !isFirefox, // Lower accuracy for Firefox initially for faster response
      timeout: isFirefox ? 15000 : 10000, // Longer timeout for Firefox
      maximumAge: isFirefox ? 60000 : 0   // Allow cached positions for Firefox
    };

    console.log('Using geolocation options:', geoOptions);

    // First check permission status using the Permissions API if available
    const checkPermissionAndGetLocation = async () => {
      try {
        let permissionState = null;

        // Check if Permissions API is available
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
            permissionState = permissionStatus.state;
            console.log('Geolocation permission status:', permissionState);

            // If permission is already denied, notify the user
            if (permissionState === 'denied') {
              console.warn('Geolocation permission already denied');
              const errorMsg = isFirefox
                ? 'Permission denied. Please allow location access in your Firefox settings (Address Bar icon or Settings → Privacy & Security → Permissions → Location).'
                : 'Permission denied. Please allow location access in your browser settings.';

              setState({
                coordinates: null,
                error: errorMsg,
                loading: false,
                permissionGranted: false,
                permissionState: 'denied',
              });

              return; // Stop here if permission is denied
            }

            // Add permission change listener (optional, for logging/debugging)
            permissionStatus.addEventListener('change', () => {
              console.log('Permission status changed to:', permissionStatus.state);
              // We don't automatically retry here, user needs to click the button again
            });
          } catch (permErr) {
            console.error('Error checking permission:', permErr);
            // Continue with geolocation request even if permission check fails
          }
        }

        // Request the position
        navigator.geolocation.getCurrentPosition(
          // Success callback
          (position) => {
            console.log('Geolocation success!', {
              lat: position.coords.latitude,
              lon: position.coords.longitude,
              accuracy: position.coords.accuracy
            });

            setState({
              coordinates: {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
              },
              error: null,
              loading: false,
              permissionGranted: true,
              permissionState: 'granted',
            });
          },
          // Error callback
          (error) => {
            let errorMessage = 'Failed to get your location';

            console.error('Geolocation error details:', {
              code: error.code,
              message: error.message,
              isFirefox: isFirefox,
              permissionState: permissionState,
              PERMISSION_DENIED: error.code === 1,
              POSITION_UNAVAILABLE: error.code === 2,
              TIMEOUT: error.code === 3,
              isSecureContext: window.isSecureContext,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent
            });

            // Handle specific error codes
            if (error.code === 1) { // PERMISSION_DENIED
              errorMessage = isFirefox
                ? 'Permission denied. Please allow location access in Firefox settings (Address Bar icon or Settings → Privacy & Security → Permissions → Location).'
                : 'Permission denied. Please allow location access to use this feature.';

              setState({
                coordinates: null,
                error: errorMessage,
                loading: false,
                permissionGranted: false,
                permissionState: 'denied',
              });
            } else if (error.code === 2) { // POSITION_UNAVAILABLE
              if (isFirefox) {
                errorMessage = 'Location permission granted, but position is currently unavailable. Please check your Operating System\'s location settings to ensure Firefox has access and location services are enabled. Using default location instead.';
              } else {
                errorMessage = 'Location unavailable. Using default location instead.';
              }
              useFallbackLocation(errorMessage);
            } else if (error.code === 3) { // TIMEOUT
              errorMessage = 'Location request timed out. Using default location instead.';
              useFallbackLocation(errorMessage);
            } else {
              // Generic error
              errorMessage = `Geolocation error (${error.code}): ${error.message}. Using default location instead.`;
              useFallbackLocation(errorMessage);
            }
          },
          // Options
          geoOptions
        );
      } catch (err) {
        console.error('Unexpected error in geolocation flow:', err);
        useFallbackLocation('Unexpected error getting location.');
      }
    };

    // Execute the geolocation request
    checkPermissionAndGetLocation();

  }, []); // Dependencies are empty as requestGeolocation doesn't depend on external state/props

  // Reset attempt count when component unmounts
  useEffect(() => {
    return () => {
      attemptCountRef.current = 0;
    };
  }, []);

  return {
    ...state,
    requestGeolocation,
    isFirefox: isFirefoxRef.current,
    // Removed resetFirefoxWorkaround
  };
}
