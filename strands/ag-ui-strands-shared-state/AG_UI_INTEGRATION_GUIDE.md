# AG-UI Strands Integration Guide

> A comprehensive guide for integrating AWS Strands agents with AG-UI frontend using CopilotKit

## Table of Contents

- [Overview](#overview)
- [Key Concepts](#key-concepts)
- [Architecture](#architecture)
- [Setup](#setup)
- [State Management](#state-management)
- [Tool Behaviors](#tool-behaviors)
- [Complete Example](#complete-example)
- [Troubleshooting](#troubleshooting)

---

## Overview

AG-UI (Agent UI) provides a bridge between Strands agents (backend) and CopilotKit (frontend), enabling:

- **Bi-directional state sharing** between agent and UI
- **Tool execution** with frontend/backend coordination
- **Generative UI** rendering based on tool calls
- **Real-time streaming** of agent responses

### When to Use This

Use AG-UI when you want to:
- Share state between your agent and React frontend
- Update UI components based on agent tool executions
- Build interactive chat interfaces with stateful widgets
- Create collaborative agent experiences

---

## Key Concepts

### 1. State Flow: Agent → Frontend

```
┌─────────────────────────────────────────────────────────────────┐
│                     Agent Execution Flow                         │
└─────────────────────────────────────────────────────────────────┘

User asks question
    ↓
Agent decides to call tool (e.g., use_aws)
    ↓
Tool executes and returns result
    ↓
state_from_result callback extracts state from tool result
    ↓
Returns StatePayload dict (e.g., {"account_info": {...}})
    ↓
AG-UI yields StateSnapshotEvent with the state
    ↓
Event sent through SSE/WebSocket to frontend
    ↓
useCoAgent hook receives state update
    ↓
React component re-renders with new state
```

### 2. Key Components

**Backend (Python):**
- `StrandsAgent`: Wrapper around Strands agent for AG-UI compatibility
- `StrandsAgentConfig`: Configuration for tool behaviors and state management
- `ToolBehavior`: Defines how each tool handles state and UI updates
- `state_from_result`: Callback to extract state from tool execution results
- `state_from_args`: Callback to extract state from tool input arguments

**Frontend (TypeScript/React):**
- `useCoAgent`: Hook to subscribe to agent state
- `CopilotKit`: Runtime that manages agent communication
- `HttpAgent`: Client that connects to your FastAPI backend

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Frontend (Next.js)                          │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  React Component                                             │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ const {state, setState} = useCoAgent({                 │ │    │
│  │  │   name: "my_agent",                                    │ │    │
│  │  │   initialState: { ... }                                │ │    │
│  │  │ });                                                     │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↕                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  CopilotKit Runtime (/api/copilotkit)                       │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ agents: {                                              │ │    │
│  │  │   my_agent: new HttpAgent({                           │ │    │
│  │  │     url: "http://localhost:8000"                      │ │    │
│  │  │   })                                                   │ │    │
│  │  │ }                                                      │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                                ↕
                    SSE/WebSocket Connection
                                ↕
┌──────────────────────────────────────────────────────────────────────┐
│                        Backend (FastAPI)                              │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  StrandsAgent                                                │    │
│  │  ┌────────────────────────────────────────────────────────┐ │    │
│  │  │ agent: Strands Agent with tools                        │ │    │
│  │  │ config: StrandsAgentConfig({                          │ │    │
│  │  │   tool_behaviors: {                                   │ │    │
│  │  │     "my_tool": ToolBehavior(                         │ │    │
│  │  │       state_from_result=extract_state_callback       │ │    │
│  │  │     )                                                 │ │    │
│  │  │   }                                                   │ │    │
│  │  │ })                                                    │ │    │
│  │  └────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↕                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  create_strands_app(agent, "/")                              │    │
│  │  → FastAPI app with streaming endpoints                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Setup

### Backend Setup

**1. Install Dependencies:**

```bash
pip install ag-ui-strands strands-agents strands-tools
```

**2. Project Structure:**

```
project/
├── agent/
│   ├── main.py          # Your agent code
│   └── .env             # Environment variables
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── copilotkit/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── components/
└── package.json
```

### Frontend Setup

**1. Install Dependencies:**

```bash
npm install @copilotkit/react-core @copilotkit/react-ui @ag-ui/client
```

**2. Configure Runtime (`src/app/api/copilotkit/route.ts`):**

```typescript
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest } from "next/server";

const serviceAdapter = new ExperimentalEmptyAdapter();

const runtime = new CopilotRuntime({
  agents: {
    my_agent: new HttpAgent({
      url: process.env.AGENT_URL || "http://localhost:8000"
    }),
  },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
```

**3. Add CopilotKit Provider (`src/app/layout.tsx`):**

```typescript
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit" agent="my_agent">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
```

---

## State Management

### Backend: Sharing State with Frontend

State flows from backend to frontend through **StateSnapshot events**. There are two ways to emit state:

#### 1. `state_from_result` - Extract State from Tool Results

Use when you want to update frontend state **after** a tool executes.

**Example: AWS Account Information**

```python
from ag_ui_strands import StrandsAgent, StrandsAgentConfig, ToolBehavior
from strands import Agent, tool
from strands_tools import use_aws

async def extract_account_info(context):
    """Extract AWS account info from use_aws tool results.

    Args:
        context: ToolResultContext with:
            - result_data: The tool's return value (can be string or dict)
            - tool_input: The arguments passed to the tool
            - tool_name: Name of the tool
            - message_id: ID of the message

    Returns:
        dict: State to send to frontend, or None to skip
    """
    try:
        result = context.result_data

        # IMPORTANT: result_data format depends on your tool
        # For use_aws, it returns a string: "Success: {...}"
        if isinstance(result, str) and result.startswith("Success:"):
            # Parse the response
            json_str = result.replace("Success:", "").strip()
            json_str = json_str.replace("'", '"')  # Convert Python dict to JSON
            response = json.loads(json_str)

            # Extract the data you want to share
            return {
                "account_info": {
                    "accountId": response.get("Account", ""),
                    "userId": response.get("UserId", ""),
                    "arn": response.get("Arn", ""),
                }
            }

        return None
    except Exception as e:
        print(f"Error extracting state: {e}")
        return None


# Configure agent
config = StrandsAgentConfig(
    tool_behaviors={
        "use_aws": ToolBehavior(
            state_from_result=extract_account_info,  # Called AFTER tool executes
        )
    }
)

# Create agent
agent = Agent(
    model=model,
    tools=[use_aws],
    system_prompt="You are an AWS assistant..."
)

# Wrap with AG-UI
agui_agent = StrandsAgent(
    agent=agent,
    name="my_agent",  # Must match frontend useCoAgent name
    config=config,
)

# Create FastAPI app
app = create_strands_app(agui_agent, "/")
```

#### 2. `state_from_args` - Extract State from Tool Arguments

Use when the state is in the tool's **input arguments** (before execution).

**Example: Update a List**

```python
async def extract_items_from_args(context):
    """Extract items from tool arguments.

    Args:
        context: ToolCallContext with:
            - tool_input: The arguments dict
            - args_str: JSON string of arguments
    """
    try:
        tool_input = context.tool_input

        # Tool was called with: update_items(items_list={"items": ["a", "b"]})
        items_data = tool_input.get("items_list", {})
        items = items_data.get("items", [])

        return {"items": items}
    except Exception:
        return None


config = StrandsAgentConfig(
    tool_behaviors={
        "update_items": ToolBehavior(
            state_from_args=extract_items_from_args,  # Called when tool is INVOKED
        )
    }
)
```

#### 3. `state_context_builder` - Inject State into Prompts

Use to give the agent context about the current state.

```python
def build_context(input_data, user_message: str) -> str:
    """Inject current state into the agent's prompt.

    Args:
        input_data: RunAgentInput with state from frontend
        user_message: The user's message

    Returns:
        Modified message with state context
    """
    state = getattr(input_data, "state", {})

    if state:
        state_json = json.dumps(state, indent=2)
        return f"Current state:\n{state_json}\n\nUser: {user_message}"

    return user_message


config = StrandsAgentConfig(
    state_context_builder=build_context,
    tool_behaviors={...}
)
```

### Frontend: Subscribing to State

```typescript
"use client";

import { useCoAgent } from "@copilotkit/react-core";
import { useEffect } from "react";

export function MyComponent() {
  const { state, setState } = useCoAgent({
    name: "my_agent",  // Must match backend StrandsAgent name
    initialState: {
      account_info: {
        accountId: "",
        userId: "",
        arn: "",
      }
    }
  });

  // Log when state updates
  useEffect(() => {
    console.log("State updated:", state);
  }, [state]);

  return (
    <div>
      <h2>Account Info</h2>
      {state.account_info && (
        <>
          <p>Account ID: {state.account_info.accountId}</p>
          <p>User ID: {state.account_info.userId}</p>
          <p>ARN: {state.account_info.arn}</p>
        </>
      )}
    </div>
  );
}
```

---

## Tool Behaviors

### ToolBehavior Configuration Options

```python
ToolBehavior(
    # State Management
    state_from_args: Optional[Callable],        # Extract state from tool input
    state_from_result: Optional[Callable],      # Extract state from tool output

    # UI Behavior
    skip_messages_snapshot: bool = False,       # Skip message history snapshot
    continue_after_frontend_call: bool = False, # Continue after frontend tool
    stop_streaming_after_result: bool = False,  # Stop streaming after result

    # Advanced
    args_streamer: Optional[Callable],          # Stream tool arguments
    custom_result_handler: Optional[Callable],  # Custom result processing
    predict_state: Optional[List],              # Predictive state updates
)
```

### Common Patterns

#### Pattern 1: Backend Tool with State Update

Tool executes on backend, updates frontend state.

```python
@tool
def fetch_data(query: str):
    """Fetch data from API."""
    data = api.fetch(query)
    return json.dumps(data)


async def extract_data_state(context):
    result = context.result_data
    # Parse and return state
    return {"data": parse_result(result)}


config = StrandsAgentConfig(
    tool_behaviors={
        "fetch_data": ToolBehavior(
            state_from_result=extract_data_state
        )
    }
)
```

#### Pattern 2: Frontend Tool

Tool executes in browser (e.g., UI interactions).

```python
@tool
def set_theme_color(color: str):
    """Change theme color (frontend only)."""
    return None  # Frontend handles execution


# Frontend
useFrontendTool({
    name: "set_theme_color",
    parameters: [{ name: "color", required: true }],
    handler({ color }) {
        setThemeColor(color);
    }
});
```

#### Pattern 3: State Update from Arguments

State is in the tool input, update immediately.

```python
@tool
def update_settings(settings: dict):
    """Update user settings."""
    save_settings(settings)
    return "Settings updated"


async def extract_settings(context):
    return {"settings": context.tool_input.get("settings", {})}


config = StrandsAgentConfig(
    tool_behaviors={
        "update_settings": ToolBehavior(
            state_from_args=extract_settings  # Update before execution
        )
    }
)
```

---

## Complete Example

### Backend (`agent/main.py`)

```python
"""Complete AG-UI Strands Integration Example."""

import json
from ag_ui_strands import StrandsAgent, StrandsAgentConfig, ToolBehavior, create_strands_app
from strands import Agent, tool
from strands.models.bedrock import BedrockModel
from strands_tools import use_aws

# 1. Define state extraction callback
async def extract_account_info(context):
    """Extract AWS account info from use_aws results."""
    try:
        result = context.result_data

        # Handle string result from use_aws
        if isinstance(result, str) and result.startswith("Success:"):
            json_str = result.replace("Success:", "").strip()
            json_str = json_str.replace("'", '"')
            response = json.loads(json_str)

            return {
                "account_info": {
                    "accountId": response.get("Account", ""),
                    "userId": response.get("UserId", ""),
                    "arn": response.get("Arn", ""),
                    "region": context.tool_input.get("region", "us-east-1")
                }
            }
    except Exception as e:
        print(f"Error: {e}")

    return None


# 2. Define context builder
def build_context(input_data, user_message: str) -> str:
    """Inject account info into prompts."""
    state = getattr(input_data, "state", {})

    if state.get("account_info"):
        info_json = json.dumps(state["account_info"], indent=2)
        return f"Current AWS account:\n{info_json}\n\nUser: {user_message}"

    return user_message


# 3. Configure agent behavior
config = StrandsAgentConfig(
    state_context_builder=build_context,
    tool_behaviors={
        "use_aws": ToolBehavior(
            state_from_result=extract_account_info,
        )
    }
)

# 4. Create Strands agent
model = BedrockModel(model_id="us.anthropic.claude-opus-4-5-20251101-v1:0")

agent = Agent(
    model=model,
    tools=[use_aws],
    system_prompt="""You are an AWS assistant.

When users ask about their AWS account, ALWAYS call use_aws with:
- service_name: 'sts'
- operation_name: 'get_caller_identity'
- parameters: {}
- region: 'us-east-1'
"""
)

# 5. Wrap with AG-UI
agui_agent = StrandsAgent(
    agent=agent,
    name="aws_agent",  # Must match frontend
    description="AWS account assistant",
    config=config,
)

# 6. Create FastAPI app
app = create_strands_app(agui_agent, "/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

### Frontend (`src/app/page.tsx`)

```typescript
"use client";

import { useCoAgent } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useEffect } from "react";

export default function Page() {
  const { state } = useCoAgent({
    name: "aws_agent",  // Must match backend
    initialState: {
      account_info: {
        accountId: "",
        userId: "",
        arn: "",
        region: "",
      }
    }
  });

  useEffect(() => {
    console.log("State:", state);
  }, [state]);

  return (
    <CopilotSidebar
      defaultOpen={true}
      labels={{
        title: "AWS Assistant",
        initial: "Ask me about your AWS account!",
      }}
    >
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">AWS Account Info</h2>

        {state.account_info?.accountId ? (
          <div className="space-y-2">
            <p><strong>Account ID:</strong> {state.account_info.accountId}</p>
            <p><strong>User ID:</strong> {state.account_info.userId}</p>
            <p><strong>ARN:</strong> {state.account_info.arn}</p>
            <p><strong>Region:</strong> {state.account_info.region}</p>
          </div>
        ) : (
          <p className="text-gray-500">Ask about your AWS account to load info</p>
        )}
      </div>
    </CopilotSidebar>
  );
}
```

---

## Troubleshooting

### State Not Updating in Frontend

**Problem:** Agent calls tool, but UI doesn't update.

**Debug Steps:**

1. **Check backend logs:**
   ```python
   async def extract_state(context):
       print("🔥 Callback called!")
       print(f"Result: {context.result_data}")
       # ... rest of code
   ```

   - If you DON'T see the callback logs → `state_from_result` isn't wired correctly
   - If you DO see logs → check what's being returned

2. **Verify result_data format:**
   ```python
   print(f"Type: {type(context.result_data)}")
   ```

   - Could be a string, dict, or other type
   - Parse accordingly

3. **Check browser console:**
   ```typescript
   useEffect(() => {
     console.log("State updated:", state);
   }, [state]);
   ```

   - See if state is received but not rendering

4. **Check network tab:**
   - Look for `/api/copilotkit` requests
   - Check SSE stream for `StateSnapshotEvent`

5. **Verify agent names match:**
   ```python
   # Backend
   StrandsAgent(name="my_agent", ...)
   ```
   ```typescript
   // Frontend
   useCoAgent({ name: "my_agent", ... })
   ```

### Agent Not Calling Tool

**Problem:** Agent responds without calling the tool.

**Solutions:**

1. **Make system prompt explicit:**
   ```python
   system_prompt = """CRITICAL: When asked about X, you MUST call tool_name.

   Example: User asks "What is X?" → call tool_name immediately."""
   ```

2. **Detect placeholder data:**
   ```python
   def build_context(input_data, user_message):
       state = getattr(input_data, "state", {})

       if state.get("data") == "PLACEHOLDER":
           return f"IMPORTANT: Call the tool to get real data.\n\n{user_message}"

       return user_message
   ```

### JSON Parsing Errors

**Problem:** `JSONDecodeError: Expecting property name enclosed in double quotes`

**Cause:** Python dict strings use single quotes (`'`), JSON requires double quotes (`"`).

**Solution:**
```python
json_str = result.replace("'", '"')
data = json.loads(json_str)
```

### TypeScript Type Errors

**Problem:** `Property 'X' does not exist on type...`

**Solution:** Add field to initialState:
```typescript
const { state } = useCoAgent({
  name: "agent",
  initialState: {
    myField: "",  // Add all fields here
  }
});
```

---

## Best Practices

### 1. Always Log in State Extractors

```python
async def extract_state(context):
    print(f"🔥 Called for {context.tool_name}")
    print(f"Result type: {type(context.result_data)}")
    print(f"Result data: {context.result_data}")

    try:
        # ... extraction logic
        state = {...}
        print(f"✅ Returning: {state}")
        return state
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None
```

### 2. Handle Different Result Formats

```python
async def extract_state(context):
    result = context.result_data

    if isinstance(result, str):
        # String result
        return parse_string(result)
    elif isinstance(result, dict):
        # Dict result
        return parse_dict(result)
    else:
        # Unknown format
        print(f"Unexpected type: {type(result)}")
        return None
```

### 3. Use Defensive Parsing

```python
async def extract_state(context):
    try:
        result = context.result_data
        data = result.get("field", {})  # Default to {}
        value = data.get("value", "")   # Default to ""

        return {"myState": value}
    except Exception as e:
        # Don't crash - return None or default state
        print(f"Error: {e}")
        return {"myState": "error"}
```

### 4. Name Consistency

```python
# Backend
agui_agent = StrandsAgent(name="my_exact_agent_name", ...)

# Frontend
useCoAgent({ name: "my_exact_agent_name", ... })

// Runtime
agents: { my_exact_agent_name: new HttpAgent(...) }
```

### 5. Test State Flow

```python
# Add test endpoint
@app.get("/test")
def test():
    return {"status": "Backend is running"}
```

```typescript
// Test state manually
const { setState } = useCoAgent({...});

// Button to test
<button onClick={() => setState({test: "value"})}>
  Test State
</button>
```

---

## Advanced Topics

### Custom Events

```python
from ag_ui.core import CustomEvent, EventType

async def custom_handler(context):
    yield CustomEvent(
        type=EventType.CUSTOM,
        name="MyCustomEvent",
        value={"foo": "bar"}
    )

config = StrandsAgentConfig(
    tool_behaviors={
        "my_tool": ToolBehavior(
            custom_result_handler=custom_handler
        )
    }
)
```

### Predictive State

```python
from ag_ui_strands import PredictStateMapping

config = StrandsAgentConfig(
    tool_behaviors={
        "update_item": ToolBehavior(
            predict_state=[
                PredictStateMapping(
                    state_key="items",
                    tool="update_item",
                    tool_argument="item_data"
                )
            ]
        )
    }
)
```

### Multi-Agent Setup

```typescript
const runtime = new CopilotRuntime({
  agents: {
    aws_agent: new HttpAgent({ url: "http://localhost:8000" }),
    data_agent: new HttpAgent({ url: "http://localhost:8001" }),
  },
});
```

---

## Resources

- **Strands Documentation:** https://docs.aws-strands.dev
- **CopilotKit Documentation:** https://docs.copilotkit.ai
- **AG-UI Repository:** https://github.com/CopilotKit/ag-ui

---

## Contributing

Found an issue or have improvements? Please contribute:

1. Test your changes thoroughly
2. Add examples for new patterns
3. Update troubleshooting section with common issues
4. Keep code examples simple and well-commented

---

*Last Updated: February 2026*
*Based on: ag-ui-strands v0.2.x, strands-agents v1.x*
