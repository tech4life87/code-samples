"use client";

import { useCoAgent, useCopilotChat } from "@copilotkit/react-core";
import { TextMessage, Role } from "@copilotkit/runtime-client-gql";
import { useEffect } from "react";
import styles from "./AWSAccountInfo.module.css";

interface AWSAccountState {
  accountId?: string;
  userId?: string;
  arn?: string;
  region?: string;
}

export function AWSAccountInfo() {
  const { state, setState } = useCoAgent({
    name: "strands_agent",
    initialState: {
      agent_state: {
        accountId: "",
        userId: "",
        arn: "",
        region: "",
      },
    },
  });

  const { appendMessage, isLoading } = useCopilotChat();

  const handleRefreshAWS = async () => {
    await appendMessage(
      new TextMessage({
        role: Role.User,
        content: "what is my current AWS account ID?"
      })
    );
  };

  useEffect(() => {
    console.log("AWSAccountInfo - Initial state:", state);
  }, []);

  useEffect(() => {
    console.log("AWSAccountInfo - State updated:", state);
  }, [state]);

  return (
    <>
      <div className={styles.terminalContainer}>
        <div className={styles.headerSection}>
          <div className={`${styles.cornerAccent} ${styles.topLeft}`} />
          <h1 className={styles.headerTitle}>AWS.STRANDS AG-UI DEMO</h1>
          <p className={styles.headerSubtitle}>Account Telemetry Interface</p>
          {state.agent_state?.accountId === "123456789012" && (
            <div className={styles.placeholderIndicator}>
              <span>⚠</span>
              <span>Simulated Data</span>
            </div>
          )}
          <div className={styles.statusBadge}>System Online</div>
        </div>

        <div className={styles.dataGrid}>
          {state.agent_state && (
            <>
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>▸ Account Identifier</span>
                <div className={styles.dataValue}>
                  {state.agent_state.accountId || "—"}
                </div>
                <div className={styles.diagonalLine} />
              </div>

              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>▸ User Identifier</span>
                <div className={styles.dataValue}>
                  {state.agent_state.userId || "—"}
                </div>
              </div>

              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>▸ Amazon Resource Name</span>
                <div className={styles.dataValue}>
                  {state.agent_state.arn || "—"}
                </div>
                <div className={styles.diagonalLine} />
              </div>

              {state.agent_state.region && (
                <div className={styles.dataRow}>
                  <span className={styles.dataLabel}>▸ Region Identifier</span>
                  <div className={styles.dataValue}>
                    {state.agent_state.region}
                  </div>
                </div>
              )}
            </>
          )}
          <div className={`${styles.cornerAccent} ${styles.bottomRight}`} />
        </div>

        <div className={styles.buttonContainer}>
          <button
            onClick={handleRefreshAWS}
            disabled={isLoading}
            className={styles.refreshButton}
            aria-label="Refresh AWS account information"
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                <span>Querying AWS...</span>
              </>
            ) : (
              <>
                <span>⟲</span>
                <span>Refresh AWS Data</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/*<div className={styles.terminalPrompt}>READY</div>*/}
    </>
  );
}