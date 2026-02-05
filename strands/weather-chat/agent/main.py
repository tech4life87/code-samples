"""Strands AG-UI Integration Example - Weather Agent.

This example demonstrates a Strands agent integrated with AG-UI, featuring:
- Shared state management between agent and UI
- Backend tool execution (get_weather)
- Frontend tools (set_theme_color)
- Generative UI rendering
"""

import json
import os
from typing import List

from ag_ui_strands import (
    StrandsAgent,
    StrandsAgentConfig,
    ToolBehavior,
    create_strands_app,
)
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from strands import Agent, tool
from strands.models.bedrock import BedrockModel

load_dotenv()


class WeatherData(BaseModel):
    """Weather data for a location."""

    location: str = Field(description="The location name")
    temperature: int = Field(description="Temperature in Fahrenheit")
    conditions: str = Field(description="Weather conditions description")
    humidity: int = Field(description="Humidity percentage")
    wind_speed: int = Field(description="Wind speed in mph")
    feels_like: int = Field(description="Feels like temperature in Fahrenheit")


@tool
def get_weather(location: str):
    """Get the current weather for a location.

    Args:
        location: The city or location to get weather for (e.g., "San Francisco", "New York")

    Returns:
        Weather information as JSON string including temperature, conditions, humidity, wind speed
    """
    import requests
    from urllib.parse import quote

    try:
        # Use geocoding to get coordinates for the location
        geocode_url = f"https://geocoding-api.open-meteo.com/v1/search?name={quote(location)}&count=1&language=en&format=json"
        geo_response = requests.get(geocode_url, timeout=5)
        geo_data = geo_response.json()

        if not geo_data.get("results"):
            return json.dumps({
                "location": location,
                "error": "Location not found",
                "temperature": None,
                "conditions": "Unknown",
                "humidity": None,
                "wind_speed": None,
                "feels_like": None
            })

        result = geo_data["results"][0]
        lat = result["latitude"]
        lon = result["longitude"]
        location_name = result["name"]

        # Get weather data
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph"
        weather_response = requests.get(weather_url, timeout=5)
        weather_data = weather_response.json()

        current = weather_data["current"]

        # Map weather codes to conditions
        weather_code = current.get("weather_code", 0)
        conditions_map = {
            0: "Clear skies",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Foggy",
            48: "Foggy",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            71: "Slight snow",
            73: "Moderate snow",
            75: "Heavy snow",
            80: "Slight rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            95: "Thunderstorm",
            96: "Thunderstorm with hail",
            99: "Thunderstorm with hail"
        }
        conditions = conditions_map.get(weather_code, "Clear skies")

        return json.dumps({
            "location": location_name,
            "temperature": round(current["temperature_2m"]),
            "conditions": conditions,
            "humidity": current["relative_humidity_2m"],
            "wind_speed": round(current["wind_speed_10m"]),
            "feels_like": round(current["apparent_temperature"])
        })
    except Exception as e:
        # Return fallback data if API fails
        return json.dumps({
            "location": location,
            "error": str(e),
            "temperature": 70,
            "conditions": "Unable to fetch weather",
            "humidity": 50,
            "wind_speed": 5,
            "feels_like": 70
        })


@tool
def set_theme_color(theme_color: str):
    """Change the theme color of the UI.

    This is a frontend tool - it returns None as the actual
    execution happens on the frontend via useFrontendTool.

    Args:
        theme_color: The color to set as theme
    """
    return None


async def weather_state_from_result(context):
    """Extract weather state from tool result.

    This function is called when get_weather tool is executed
    to emit a state snapshot to the UI.

    Args:
        context: ToolResultContext containing tool execution details

    Returns:
        dict: State snapshot with weather data, or None on error
    """
    try:
        result = context.result
        if isinstance(result, str):
            weather_data = json.loads(result)
        else:
            weather_data = result

        return {"weather": weather_data}
    except Exception:
        return None


# Configure agent behavior
shared_state_config = StrandsAgentConfig(
    tool_behaviors={
        "get_weather": ToolBehavior(
            skip_messages_snapshot=True,
            state_from_result=weather_state_from_result,
        )
    },
)

# Initialize Bedrock model
model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
    region_name="us-east-1",
)

system_prompt = (
    "You are a helpful weather assistant that provides current weather information for any location."
)

# Create Strands agent with tools
# Note: Frontend tools (set_theme_color) return None - actual execution happens in the UI
strands_agent = Agent(
    model=model,
    system_prompt=system_prompt,
    tools=[get_weather, set_theme_color],
)

# Wrap with AG-UI integration
agui_agent = StrandsAgent(
    agent=strands_agent,
    name="weather_agent",
    description="A weather assistant that provides current weather information",
    config=shared_state_config,
)

# Create the FastAPI app
agent_path = os.getenv("AGENT_PATH", "/")
app = create_strands_app(agui_agent, agent_path)

if __name__ == "__main__":
    import uvicorn

    port  = int(os.getenv("AGENT_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
