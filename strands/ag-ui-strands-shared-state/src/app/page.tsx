"use client";

import { useFrontendTool } from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar } from "@copilotkit/react-ui";
import { useEffect, useState } from "react";
import { AWSAccountInfo } from "@/components/AWSAccountInfo";
import styles from "./page.module.css";

export default function CopilotKitPage() {
  const [themeColor, setThemeColor] = useState("#ff0059");

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
    <>
      <div className={styles.cyberGrid} />
      <div className={styles.scanline} />
      <div className={styles.noiseOverlay} />

      <main
        style={
          { "--copilot-kit-primary-color": themeColor } as CopilotKitCSSProperties
        }
      >
          <AWSAccountInfo />
        <CopilotSidebar
          clickOutsideToClose={true}
          defaultOpen={true}
          labels={{
            title: "STRANDS.AGENT",
            initial: "▸ TERMINAL INITIALIZED. Strands agent standing by.",
          }}
          suggestions={[
            {
              title: "▸ Click to see AWS Account Information",
              message: "what is my current AWS account ID?"
            }
          ]}
        >

        </CopilotSidebar>
      </main>
    </>
  );
}
