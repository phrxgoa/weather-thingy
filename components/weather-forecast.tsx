import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from "lucide-react"

interface WeatherForecastProps {
  day: string
  temperature: number
  condition: string
}

export default function WeatherForecast({ day, temperature, condition }: WeatherForecastProps) {
  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase()
    
    // Handle various weather conditions from the API
    if (conditionLower.includes("clear") || conditionLower.includes("sunny")) {
      return <Sun className="w-10 h-10" />
    } else if (conditionLower.includes("rain") || conditionLower.includes("drizzle")) {
      return <CloudRain className="w-10 h-10" />
    } else if (conditionLower.includes("snow")) {
      return <CloudSnow className="w-10 h-10" />
    } else if (conditionLower.includes("thunder") || conditionLower.includes("lightning")) {
      return <CloudLightning className="w-10 h-10" />
    } else if (conditionLower.includes("fog") || conditionLower.includes("mist") || conditionLower.includes("haze")) {
      return <CloudFog className="w-10 h-10" />
    } else {
      // Default to cloudy for any other condition
      return <Cloud className="w-10 h-10" />
    }
  }

  return (
    <div className="border-2 border-black p-4 text-center">
      <div className="text-lg font-bold mb-2">{day}</div>
      <div className="flex justify-center mb-2">{getWeatherIcon(condition)}</div>
      <div className="text-xl font-bold">{temperature}°</div>
    </div>
  )
}
