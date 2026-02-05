"use client";

import {
  useDefaultTool,
  useRenderToolCall,
  useFrontendTool,
  useCoAgent,
} from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar } from "@copilotkit/react-ui";
import { useEffect, useState } from "react";
import { DefaultToolComponent } from "@/components/default-tool-ui";
import { WeatherCard } from "@/components/weather";

export default function CopilotKitPage() {
  const [themeColor, setThemeColor] = useState("#6366f1");

  useEffect(() => {
    console.log(themeColor);
  }, [themeColor]);

  // 🪁 Frontend Actions: https://docs.copilotkit.ai/guides/frontend-actions
  useFrontendTool({
    name: "set_theme_color",
    parameters: [
      {
        name: "theme_color",
        description: "The theme color to set. Make sure to pick nice colors.",
        required: true,
      },
    ],
    handler({ theme_color }) {
      setThemeColor(theme_color);
    },
  });

  return (
    <main
      style={
        { "--copilot-kit-primary-color": themeColor } as CopilotKitCSSProperties
      }
    >
      <CopilotSidebar
        clickOutsideToClose={false}
        defaultOpen={true}
        // Adds an initial message to the chat
        labels={{
          title: "Popup Assistant",
          initial: "👋 Hi, there! You're chatting with an Strands agent.",
        }}
        // Suggestions for guiding users
        suggestions={[
          {
            title: "Check the weather in your city!!!",
            message: "What's the weather in Nashville",
          }
        ]}
      >
        {/* Wrapping your content in the sidebar pushes it to the side*/}
        <YourMainContent themeColor={themeColor} />
      </CopilotSidebar>
    </main>
  );
}

function YourMainContent({ themeColor }: { themeColor: string }) {
  // 🪁 Use CoAgent to get shared state from backend
  const { state } = useCoAgent({
    name: "weather_agent",
    initialState: {
      weather: null,
    },
  });

  useEffect(() => {
    console.log("State updated:", state);
  }, [state]);

  //🪁 Generative UI: https://docs.copilotkit.ai/strands/generative-ui/backend-tools
  useRenderToolCall(
    {
      name: "get_weather",
      parameters: [
        {
          name: "location",
          description: "The location to get the weather for.",
          required: true,
        },
      ],
      render: (props) => (
        <WeatherCard
          themeColor={themeColor}
          location={props.args.location}
          result={props.result}
        />
      ),
    },
    [themeColor],
  );

  //🪁 Default Generative UI: https://docs.copilotkit.ai/strands/generative-ui/backend-tools
  useDefaultTool(
    {
      render: (props) => (
        <DefaultToolComponent themeColor={themeColor} {...props} />
      ),
    },
    [themeColor],
  );

  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="h-screen flex justify-center items-center flex-col transition-colors duration-300"
    >
      <div className="bg-white/20 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">
          Weather Dashboard
        </h1>
        <p className="text-gray-200 text-center italic mb-6">
          Ask me about the weather in any city! 🌤️
        </p>
        <hr className="border-white/20 my-6" />

        {state.weather ? (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">
                {state.weather.location}
              </h2>
              <div className="text-6xl font-bold text-white my-6">
                {state.weather.temperature}°F
              </div>
              <p className="text-xl text-white/90 mb-6">
                {state.weather.conditions}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 p-4 rounded-xl text-center">
                <p className="text-white/70 text-sm mb-1">Humidity</p>
                <p className="text-white text-2xl font-semibold">
                  {state.weather.humidity}%
                </p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl text-center">
                <p className="text-white/70 text-sm mb-1">Wind Speed</p>
                <p className="text-white text-2xl font-semibold">
                  {state.weather.wind_speed} mph
                </p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl text-center">
                <p className="text-white/70 text-sm mb-1">Feels Like</p>
                <p className="text-white text-2xl font-semibold">
                  {state.weather.feels_like}°F
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-white/80 italic my-8">
            No weather data yet. Ask me about the weather in any city!
          </p>
        )}
      </div>
    </div>
  );
}
