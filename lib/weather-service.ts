
// Types for API responses
export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  high: number;
  low: number;
  humidity: number;
  wind: number;
  visibility: number;
  forecast: ForecastDay[];
}

export interface ForecastDay {
  day: string;
  temp: number;
  condition: string;
}

interface OpenWeatherResponse {
  lat: number;
  lon: number;
  timezone: string;
  current: {
    dt: number;
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    visibility: number;
    weather: {
      id: number;
      main: string;
      description: string;
      icon: string;
    }[];
  };
  daily: {
    dt: number;
    temp: {
      day: number;
      min: number;
      max: number;
    };
    weather: {
      id: number;
      main: string;
      description: string;
      icon: string;
    }[];
  }[];
}

// API key from environment variables
const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '';

// Ensure API key is available
if (!API_KEY) {
  console.error('OpenWeather API key is missing. Please set NEXT_PUBLIC_OPENWEATHER_API_KEY in your .env.local file.');
}

// Days of the week for forecast
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Fetch weather data from OpenWeatherMap API
 */
export async function fetchWeatherData(lat: number, lon: number): Promise<WeatherData> {
  try {
    console.log(`Fetching weather data for coordinates: lat=${lat}, lon=${lon}`);
    
    // Use API 2.5 as the primary method since it's more reliable and doesn't require subscription
    console.log('Using OpenWeatherMap API 2.5');
    
    // Get current weather
    const currentResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );
    
    if (!currentResponse.ok) {
      throw new Error(`Weather API 2.5 current error: ${currentResponse.status}`);
    }
    
    // Get forecast
    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );
    
    if (!forecastResponse.ok) {
      throw new Error(`Weather API 2.5 forecast error: ${forecastResponse.status}`);
    }
    
    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();
    
    console.log('Weather data received from API 2.5:', { 
      current: currentData.main, 
      weather: currentData.weather,
      forecast: forecastData.list.slice(0, 3) // Just log a few forecast items
    });
    
    // Format the data from API 2.5
    return formatWeatherDataFromAPI25(currentData, forecastData);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
}

/**
 * Fetch weather data by city name
 * This uses the geocoding API to convert city name to coordinates
 */
export async function fetchWeatherByCity(city: string): Promise<WeatherData> {
  try {
    // First, get coordinates for the city
    const geoResponse = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
    );

    if (!geoResponse.ok) {
      throw new Error(`Geocoding API error: ${geoResponse.status}`);
    }

    const geoData = await geoResponse.json();
    
    if (!geoData || geoData.length === 0) {
      throw new Error(`City not found: ${city}`);
    }

    const { lat, lon } = geoData[0];
    
    // Then fetch weather with coordinates
    return fetchWeatherData(lat, lon);
  } catch (error) {
    console.error('Error fetching weather by city:', error);
    throw error;
  }
}

/**
 * Format the API 3.0 response into our app's data structure
 */
function formatWeatherData(data: OpenWeatherResponse): WeatherData {
  // Get the current weather
  const current = data.current;
  const currentWeather = current.weather[0];
  
  // Format the forecast data
  const forecast = data.daily.slice(1, 6).map((day) => {
    const date = new Date(day.dt * 1000);
    return {
      day: DAYS[date.getDay()],
      temp: Math.round(day.temp.day),
      condition: day.weather[0].main.toLowerCase(),
    };
  });

  // Create location string (we'll update this when we have city name)
  const location = "Current Location";

  return {
    location,
    temperature: Math.round(current.temp),
    condition: currentWeather.main.toUpperCase(),
    high: Math.round(data.daily[0].temp.max),
    low: Math.round(data.daily[0].temp.min),
    humidity: current.humidity,
    wind: Math.round(current.wind_speed),
    visibility: Math.round(current.visibility / 1000), // Convert to km
    forecast,
  };
}

/**
 * Format the API 2.5 response into our app's data structure
 * This is a fallback in case the 3.0 API doesn't work
 */
function formatWeatherDataFromAPI25(currentData: any, forecastData: any): WeatherData {
  // Get the current weather
  const currentWeather = currentData.weather[0];
  
  // Process forecast data - API 2.5 returns forecast in 3-hour intervals
  // We'll pick one forecast per day (at noon) for the next 5 days
  const processedForecast: ForecastDay[] = [];
  const today = new Date().setHours(0, 0, 0, 0);
  
  // Group forecasts by day
  const forecastsByDay: Record<string, any[]> = {};
  
  forecastData.list.forEach((item: any) => {
    const date = new Date(item.dt * 1000);
    const day = date.toISOString().split('T')[0];
    
    if (!forecastsByDay[day]) {
      forecastsByDay[day] = [];
    }
    
    forecastsByDay[day].push(item);
  });
  
  // Get one forecast per day (preferably around noon)
  Object.keys(forecastsByDay).slice(0, 5).forEach((day) => {
    const items = forecastsByDay[day];
    // Try to find forecast around noon
    const noonForecast = items.find((item) => {
      const date = new Date(item.dt * 1000);
      return date.getHours() >= 11 && date.getHours() <= 13;
    }) || items[0]; // Fallback to first item if noon forecast not found
    
    const date = new Date(noonForecast.dt * 1000);
    processedForecast.push({
      day: DAYS[date.getDay()],
      temp: Math.round(noonForecast.main.temp),
      condition: noonForecast.weather[0].main.toLowerCase(),
    });
  });
  
  // Fill in missing days if we don't have 5 days of forecast
  while (processedForecast.length < 5) {
    const lastDay = processedForecast.length > 0 
      ? new Date(new Date().setDate(new Date().getDate() + processedForecast.length))
      : new Date(new Date().setDate(new Date().getDate() + 1));
    
    processedForecast.push({
      day: DAYS[lastDay.getDay()],
      temp: Math.round(currentData.main.temp), // Use current temp as fallback
      condition: 'cloudy', // Default condition
    });
  }

  return {
    location: "Current Location", // Will be updated later with reverse geocoding
    temperature: Math.round(currentData.main.temp),
    condition: currentWeather.main.toUpperCase(),
    high: Math.round(currentData.main.temp_max),
    low: Math.round(currentData.main.temp_min),
    humidity: currentData.main.humidity,
    wind: Math.round(currentData.wind.speed),
    visibility: Math.round((currentData.visibility || 10000) / 1000), // Convert to km
    forecast: processedForecast,
  };
}

/**
 * Get city name from coordinates using reverse geocoding
 */
export async function getCityFromCoords(lat: number, lon: number): Promise<string> {
  try {
    console.log(`Getting city name for coordinates: lat=${lat}, lon=${lon}`);
    
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
    );

    if (!response.ok) {
      console.warn(`Reverse geocoding API error: ${response.status}`);
      
      // If we're using the New York fallback coordinates, return New York
      if (Math.abs(lat - 40.7128) < 0.01 && Math.abs(lon - (-74.0060)) < 0.01) {
        return "NEW YORK, US";
      }
      
      return "Current Location";
    }

    const data = await response.json();
    console.log('Reverse geocoding data:', data);
    
    if (!data || data.length === 0) {
      console.warn('No location data returned from reverse geocoding');
      return "Current Location";
    }

    const { name, country } = data[0];
    const locationName = `${name.toUpperCase()}, ${country}`;
    console.log('Location name determined:', locationName);
    return locationName;
  } catch (error) {
    console.error('Error getting city from coordinates:', error);
    
    // If we're using the New York fallback coordinates, return New York
    if (Math.abs(lat - 40.7128) < 0.01 && Math.abs(lon - (-74.0060)) < 0.01) {
      return "NEW YORK, US";
    }
    
    return "Current Location";
  }
}