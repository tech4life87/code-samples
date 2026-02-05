interface WeatherData {
  location: string;
  temperature: number;
  conditions: string;
  humidity: number;
  wind_speed: number;
  feels_like: number;
  error?: string;
}

interface WeatherCardProps {
  themeColor: string;
  location?: string;
  result?: string;
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-14 h-14 text-yellow-200"
    >
      <circle cx="12" cy="12" r="5" />
      <path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        strokeWidth="2"
        stroke="currentColor"
      />
    </svg>
  );
}

export function WeatherCard({ themeColor, location, result }: WeatherCardProps) {
  // Parse weather data from the tool result
  let weatherData: WeatherData | null = null;

  if (result) {
    try {
      // Result might be already parsed as an object or a JSON string
      weatherData = typeof result === 'string' ? JSON.parse(result) : result;
    } catch (e) {
      console.error("Failed to parse weather data:", e);
    }
  }

  // Use parsed data or fallback to defaults
  const displayLocation = weatherData?.location || location || "Unknown Location";
  const temperature = weatherData?.temperature ?? 70;
  const conditions = weatherData?.conditions || "Clear skies";
  const humidity = weatherData?.humidity ?? 45;
  const windSpeed = weatherData?.wind_speed ?? 5;
  const feelsLike = weatherData?.feels_like ?? 72;

  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="rounded-xl shadow-xl mt-6 mb-4 max-w-md w-full"
    >
      <div className="bg-white/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white capitalize">
              {displayLocation}
            </h3>
            <p className="text-white">Current Weather</p>
          </div>
          <SunIcon />
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div className="text-3xl font-bold text-white">{temperature}°</div>
          <div className="text-sm text-white">{conditions}</div>
        </div>

        <div className="mt-4 pt-4 border-t border-white">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-white text-xs">Humidity</p>
              <p className="text-white font-medium">{humidity}%</p>
            </div>
            <div>
              <p className="text-white text-xs">Wind</p>
              <p className="text-white font-medium">{windSpeed} mph</p>
            </div>
            <div>
              <p className="text-white text-xs">Feels Like</p>
              <p className="text-white font-medium">{feelsLike}°</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
