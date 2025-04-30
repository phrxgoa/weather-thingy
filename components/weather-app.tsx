"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { AlertCircle, Cloud, CloudRain, Droplets, Eye, Loader2, MapPin, Search, Sun, Thermometer, Wind } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import WeatherForecast from "./weather-forecast"
import LocationPermissionModal from "./location-permission-modal"
import { useGeolocation } from "@/hooks/useGeolocation"
import { fetchWeatherData, fetchWeatherByCity, getCityFromCoords, type WeatherData } from "@/lib/weather-service"

// Fallback weather data in case of errors
const fallbackWeatherData = {
  location: "NEW YORK, US",
  temperature: 18,
  condition: "PARTLY CLOUDY",
  high: 21,
  low: 14,
  humidity: 65,
  wind: 12,
  visibility: 10,
  forecast: [
    { day: "MON", temp: 18, condition: "cloudy" },
    { day: "TUE", temp: 20, condition: "sunny" },
    { day: "WED", temp: 17, condition: "rainy" },
    { day: "THU", temp: 16, condition: "cloudy" },
    { day: "FRI", temp: 19, condition: "sunny" },
  ],
}

export default function WeatherApp() {
  const [searchQuery, setSearchQuery] = useState("")
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [currentTime, setCurrentTime] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPermissionModal, setShowPermissionModal] = useState(false)

  // Use our custom geolocation hook
  const {
    coordinates,
    error: geoError,
    loading: geoLoading,
    permissionGranted,
    permissionState,
    requestGeolocation,
    isFirefox,
    // resetFirefoxWorkaround, // Removed
    // testMDNApproach // Removed
  } = useGeolocation()

  // Update the time every second to keep the clock accurate
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      // Get hours and minutes separately to format with blinking colon
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      // We'll format the time in the render function with a blinking colon
      setCurrentTime(`${hours}:${minutes}`)
    }

    updateTime()
    // Update every second to keep the clock accurate
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [])

  // Show location permission modal on first load
  useEffect(() => {
    // Only show if permission state is null (meaning we haven't asked yet)
    if (permissionGranted === null) {
      setShowPermissionModal(true)
    }
  }, [permissionGranted])

  // Fetch weather data when coordinates change
  useEffect(() => {
    if (coordinates) {
      console.log('Coordinates changed, fetching weather data:', coordinates);
      fetchWeatherByCoordinates(coordinates.lat, coordinates.lon);
    }
  }, [coordinates]);

  // Display geolocation errors but don't block weather display if using fallback
  useEffect(() => {
    if (geoError) {
      console.log('Geolocation error in component:', geoError);

      // Only set the error if it's a permission denied error or a general failure
      // If the hook returned coordinates (meaning it used fallback), we don't show a blocking error
      if (permissionGranted === false || !coordinates) {
         setError(geoError);
      } else {
        // If coordinates were returned (likely fallback), just log the error
        console.warn('Geolocation error occurred, but using fallback location:', geoError);
        setError(null); // Clear previous error if fallback is used
      }
    } else {
       setError(null); // Clear error if geoError becomes null
    }
  }, [geoError, permissionGranted, coordinates]);


  // Fetch weather data by coordinates
  const fetchWeatherByCoordinates = async (lat: number, lon: number) => {
    console.log(`fetchWeatherByCoordinates called with lat=${lat}, lon=${lon}`);

    try {
      setLoading(true);
      setError(null);

      // Fetch weather data
      console.log('Calling fetchWeatherData...');
      const data = await fetchWeatherData(lat, lon);
      console.log('Weather data received:', data);

      // Get city name from coordinates
      console.log('Getting city name from coordinates...');
      const locationName = await getCityFromCoords(lat, lon);
      console.log('City name received:', locationName);

      // Update weather data with location name
      console.log('Updating weather data with location name');
      setWeatherData({
        ...data,
        location: locationName
      });
      console.log('Weather data updated successfully');
    } catch (err: any) {
      console.error('Error fetching weather data:', err);
      // Only set error if we couldn't fetch weather data at all
      if (!weatherData) {
         setError(`Failed to fetch weather data: ${err.message || 'Please try again.'}`);
      } else {
         // If we already have data, maybe just log the error or show a less intrusive message
         console.warn('Failed to update weather data:', err.message);
         // Optionally show a temporary toast or similar instead of replacing the main error
      }


      // Use fallback data if we don't have any data yet
      if (!weatherData) {
        console.log('Using fallback weather data');
        setWeatherData(fallbackWeatherData);
      }
    } finally {
      setLoading(false);
    }
  }

  // Handle search form submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) return

    try {
      setLoading(true)
      setError(null)

      // Fetch weather data by city name
      const data = await fetchWeatherByCity(searchQuery)
      setWeatherData(data)
      setSearchQuery("")
    } catch (err) {
      console.error('Error searching for location:', err)
      setError('Location not found. Please try another search term.')
    } finally {
      setLoading(false)
    }
  }

  // Handle location permission
  const handleAllowLocation = () => {
    console.log('User allowed location access in our modal');
    setShowPermissionModal(false);

    // Add a small delay to ensure the modal is closed before requesting geolocation
    // Use a longer delay for Firefox (though the hook handles options now)
    const delay = isFirefox ? 800 : 100;

    setTimeout(() => {
      console.log(`Requesting geolocation after modal closed (delay: ${delay}ms)`);
      requestGeolocation();
    }, delay);
  }

  const handleDenyLocation = () => {
    setShowPermissionModal(false)
    // Use fallback data if we don't have any data yet
    if (!weatherData) {
      setWeatherData(fallbackWeatherData)
    }
  }

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case "clear":
      case "sunny":
        return <Sun className="w-24 h-24" />
      case "rain":
      case "rainy":
      case "drizzle":
        return <CloudRain className="w-24 h-24" />
      default:
        return <Cloud className="w-24 h-24" />
    }
  }

  return (
    <div className="font-mono">
      {/* Location Permission Modal */}
      {showPermissionModal && (
        <LocationPermissionModal
          onAllow={handleAllowLocation}
          onDeny={handleDenyLocation}
        />
      )}

      {/* Header */}
      <header className="border-b-8 border-black p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-4xl font-bold tracking-tighter">WEATHER_NOW</h1>
          <div className="text-xl font-bold">
            {currentTime.split(':')[0]}
            <span className="blink-colon">:</span>
            {currentTime.split(':')[1]}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8 border-4 border-black p-2 flex">
          <Input
            type="text"
            placeholder="SEARCH LOCATION"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-none text-lg font-bold placeholder:text-gray-500 focus-visible:ring-0"
            disabled={loading}
          />
          <Button
            type="submit"
            className="bg-black hover:bg-gray-800 text-white"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </Button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-8 border-4 border-red-500 bg-red-50 p-4 flex items-center">
            <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
            <p className="text-red-500 font-bold">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && !weatherData && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-16 h-16 animate-spin mb-4" />
            <p className="text-xl font-bold">Loading weather data...</p>
          </div>
        )}

        {/* Weather Data */}
        {weatherData && (
          <>
            {/* Current Weather */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="border-4 border-black p-6">
                <div className="flex items-center mb-4">
                  <MapPin className="w-6 h-6 mr-2" />
                  <h2 className="text-2xl font-bold">{weatherData.location}</h2>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-8xl font-bold">{weatherData.temperature}°</div>
                    <div className="text-xl font-bold mt-2">{weatherData.condition}</div>
                  </div>
                  {getWeatherIcon(weatherData.condition)}
                </div>

                <div className="flex justify-between mt-4 text-lg">
                  <div>H: {weatherData.high}°</div>
                  <div>L: {weatherData.low}°</div>
                </div>
              </div>

              <div className="border-4 border-black p-6">
                <h2 className="text-2xl font-bold mb-4">DETAILS</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between border-b-2 border-black pb-2">
                    <div className="flex items-center">
                      <Thermometer className="w-5 h-5 mr-2" />
                      <span>FEELS LIKE</span>
                    </div>
                    <div className="font-bold">{weatherData.temperature}°</div>
                  </div>

                  <div className="flex items-center justify-between border-b-2 border-black pb-2">
                    <div className="flex items-center">
                      <Droplets className="w-5 h-5 mr-2" />
                      <span>HUMIDITY</span>
                    </div>
                    <div className="font-bold">{weatherData.humidity}%</div>
                  </div>

                  <div className="flex items-center justify-between border-b-2 border-black pb-2">
                    <div className="flex items-center">
                      <Wind className="w-5 h-5 mr-2" />
                      <span>WIND</span>
                    </div>
                    <div className="font-bold">{weatherData.wind} KM/H</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Eye className="w-5 h-5 mr-2" />
                      <span>VISIBILITY</span>
                    </div>
                    <div className="font-bold">{weatherData.visibility} KM</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Forecast */}
            <div className="border-4 border-black p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">5-DAY FORECAST</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {weatherData.forecast.map((day, index) => (
                  <WeatherForecast key={index} day={day.day} temperature={day.temp} condition={day.condition} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Location Button */}
        {!loading && (
          <div className="flex flex-col items-center mb-8">
            <Button
              onClick={requestGeolocation}
              className="bg-black hover:bg-gray-800 text-white flex items-center"
              disabled={geoLoading}
            >
              {geoLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <MapPin className="w-5 h-5 mr-2" />
              )}
              {geoLoading
                  ? "Getting Location..."
                  : permissionGranted === false
                    ? "Allow Location Access" // Button text when permission is explicitly denied
                    : "Use My Location" // Default text
              }
            </Button>

            {/* Firefox-specific help text */}
            {isFirefox && permissionGranted === false && (
              <div className="mt-2 text-xs text-gray-600 max-w-md text-center p-2 bg-gray-100 rounded-md">
                <p className="font-semibold mb-1">Firefox Location Access Help</p>
                <p>
                  Firefox requires multiple levels of permission for location access:
                </p>
                <ol className="text-left list-decimal pl-5 mt-1">
                  <li><strong>First:</strong> Click the button above to request location access</li>
                  <li><strong>Then:</strong> Look for the location icon in the address bar and click it</li>
                  <li><strong>Finally:</strong> Go to Settings → Privacy & Security → Permissions → Location</li>
                  <li>Find this website in the list and set it to "Allow"</li>
                </ol>
                {/* Removed Try Again and MDN Approach buttons */}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t-8 border-black p-4 mt-8">
        <div className="container mx-auto">
          <div className="text-center font-bold">WEATHER APP © {new Date().getFullYear()}</div>
        </div>
      </footer>
    </div>
  )
}
