from typing import Dict, Any, Optional
import httpx
import os


class WeatherService:
    """Weather API service for workout recommendations"""

    def __init__(self):
        # Using OpenWeatherMap API (free tier available)
        # You can also use other weather APIs
        self.api_key = os.getenv("OPENWEATHER_API_KEY", "")
        self.base_url = "https://api.openweathermap.org/data/2.5"

    async def get_current_weather(self, city: str = "Durham,NC", units: str = "imperial") -> Dict[str, Any]:
        """Get current weather conditions"""
        if not self.api_key:
            # Return mock data if no API key
            return {
                "temp": 72,
                "condition": "clear",
                "description": "clear sky",
                "humidity": 65,
                "windSpeed": 5,
                "recommendation": "outdoor",
            }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/weather",
                    params={
                        "q": city,
                        "appid": self.api_key,
                        "units": units,
                    },
                    timeout=5.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    temp = data["main"]["temp"]
                    condition = data["weather"][0]["main"].lower()
                    description = data["weather"][0]["description"]
                    humidity = data["main"]["humidity"]
                    wind_speed = data.get("wind", {}).get("speed", 0)

                    # Determine recommendation
                    recommendation = "outdoor"
                    if condition in ["rain", "snow", "thunderstorm", "drizzle"]:
                        recommendation = "indoor"
                    elif temp < 32 or temp > 95:
                        recommendation = "indoor"
                    elif wind_speed > 20:
                        recommendation = "indoor"

                    return {
                        "temp": round(temp),
                        "condition": condition,
                        "description": description,
                        "humidity": humidity,
                        "windSpeed": round(wind_speed, 1),
                        "recommendation": recommendation,
                    }
        except Exception as e:
            print(f"Weather API error: {e}")

        # Fallback to mock data
        return {
            "temp": 72,
            "condition": "clear",
            "description": "clear sky",
            "humidity": 65,
            "windSpeed": 5,
            "recommendation": "outdoor",
        }

    def get_workout_recommendation(self, weather_data: Dict[str, Any]) -> str:
        """Get workout recommendation based on weather"""
        recommendation = weather_data.get("recommendation", "outdoor")
        condition = weather_data.get("condition", "clear")
        temp = weather_data.get("temp", 72)

        if recommendation == "indoor":
            if condition in ["rain", "snow"]:
                return f"It's {condition} outside ({temp}°F). Perfect for indoor workouts like yoga, strength training, or spin class!"
            elif temp < 32:
                return f"It's cold outside ({temp}°F). Let's do an indoor workout today - maybe a HIIT class or strength training?"
            elif temp > 95:
                return f"It's hot outside ({temp}°F). Stay cool with an indoor workout - try yoga, pilates, or a gym session!"
        else:
            return f"Great weather today! ({temp}°F, {weather_data.get('description', 'clear')}) Perfect for outdoor activities like running, cycling, or outdoor yoga!"

