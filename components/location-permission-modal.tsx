"use client"

import React from 'react';
import { MapPin, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';

interface LocationPermissionModalProps {
  onAllow: () => void;
  onDeny: () => void;
}

export default function LocationPermissionModal({ onAllow, onDeny }: LocationPermissionModalProps) {
  // Add a debug log when the modal is rendered
  console.log('Location permission modal rendered');

  // Get Firefox detection from our hook
  const { isFirefox } = useGeolocation();

  console.log('Is Firefox browser:', isFirefox);

  const handleAllowClick = () => {
    console.log('Allow location access button clicked');
    onAllow();
  };

  const handleDenyClick = () => {
    console.log('Deny location access button clicked');
    onDeny();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Location Access</h2>
          <Button variant="ghost" size="icon" onClick={handleDenyClick} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-center mb-6">
          <MapPin className="w-16 h-16" />
        </div>

        <p className="mb-4 text-center">
          WEATHER_NOW would like to access your location to provide accurate weather information for your area.
        </p>

        <p className="mb-4 text-center text-sm text-gray-600">
          When you click "Allow", your browser will show a permission prompt.
          Please click "Allow" in that prompt to share your location.
        </p>

        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-center text-sm text-yellow-700">
            <strong>Note:</strong> If your location can't be determined, we'll use a default location to show you how the app works.
          </p>

          {isFirefox && (
            <div className="mt-2 pt-2 border-t border-yellow-200">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 mr-1" />
                <span className="font-bold text-amber-600">Important Firefox Instructions</span>
              </div>
              <p className="text-center text-sm text-yellow-700 mb-2">
                Firefox has stricter privacy settings for location access. Please follow these steps:
              </p>
              <ol className="text-sm text-yellow-700 list-decimal pl-5 space-y-1">
                <li><strong>First:</strong> When prompted, click "Allow" to share your location</li>
                <li><strong>Then:</strong> Look for the location icon in the address bar and click it</li>
                <li><strong>Check Firefox settings:</strong> Menu → Settings → Privacy & Security → Permissions → Location</li>
                <li>Find this website in the list and set it to "Allow"</li>
                <li>If the site isn't listed, refresh the page and try again</li>
                <li>Make sure Firefox has permission to access your location at the system level</li>
              </ol>
              <div className="mt-3 p-2 bg-amber-100 rounded-md">
                <p className="text-center text-xs text-amber-800 font-semibold">
                  Firefox requires multiple levels of permission:
                </p>
                <ul className="text-xs text-amber-800 list-disc pl-5 mt-1">
                  <li>Browser prompt permission</li>
                  <li>Site-specific permission in Firefox settings</li>
                  <li>System-level location permission</li>
                </ul>
                <p className="text-center text-xs text-amber-800 mt-1">
                  If location still doesn't work after allowing all permissions, try using Chrome for the best experience.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleAllowClick}
            className="w-full bg-black hover:bg-gray-800 text-white"
          >
            Allow Location Access
          </Button>
          <Button
            onClick={handleDenyClick}
            variant="outline"
            className="w-full border-black hover:bg-gray-100"
          >
            No Thanks
          </Button>
        </div>
      </div>
    </div>
  );
}