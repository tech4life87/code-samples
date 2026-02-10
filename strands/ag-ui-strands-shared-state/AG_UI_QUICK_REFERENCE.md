# AG-UI Strands Quick Reference

> Essential patterns and snippets for AG-UI integration

## 🚀 Quick Start (5 Minutes)

### Backend Setup

```python
from ag_ui_strands import StrandsAgent, StrandsAgentConfig, ToolBehavior, create_strands_app
from strands import Agent, tool

# 1. Define state extractor
async def extract_state(context):
    result = context.result_data
    # Parse your tool result and return state dict
    return {"myState": parse(result)}

# 2. Configure
config = StrandsAgentConfig(
    tool_behaviors={
        "my_tool": ToolBehavior(state_from_result=extract_state)
    }
)

# 3. Create agent
agent = Agent(model=model, tools=[my_tool])
agui_agent = StrandsAgent(agent, name="my_agent", config=config)
app = create_strands_app(agui_agent, "/")
```

### Frontend Setup

```typescript
// 1. API Route (src/app/api/copilotkit/route.ts)
import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";

const runtime = new CopilotRuntime({
  agents: { my_agent: new HttpAgent({ url: "http://localhost:8000" }) }
});

export const POST = async (req) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime, serviceAdapter: new ExperimentalEmptyAdapter(), endpoint: "/api/copilotkit"
  });
  return handleRequest(req);
};

// 2. Use State (src/app/page.tsx)
import { useCoAgent } from "@copilotkit/react-core";

export default function Page() {
  const { state } = useCoAgent({
    name: "my_agent",
    initialState: { myState: "" }
  });

  return <div>{state.myState}</div>;
}
```

---

## 📋 Common Patterns

### Pattern: Extract from Tool Result (AFTER execution)

```python
async def extract_from_result(context):
    """Called AFTER tool executes."""
    result = context.result_data  # Tool return value

    # Handle string result
    if isinstance(result, str):
        return {"data": parse_string(result)}

    # Handle dict result
    if isinstance(result, dict):
        return {"data": result.get("field")}

    return None

config = StrandsAgentConfig(
    tool_behaviors={
        "fetch_data": ToolBehavior(state_from_result=extract_from_result)
    }
)
```

### Pattern: Extract from Tool Args (BEFORE execution)

```python
async def extract_from_args(context):
    """Called when tool is INVOKED (before execution)."""
    tool_input = context.tool_input  # Arguments passed to tool

    return {"items": tool_input.get("items", [])}

config = StrandsAgentConfig(
    tool_behaviors={
        "update_items": ToolBehavior(state_from_args=extract_from_args)
    }
)
```

### Pattern: Inject State into Prompts

```python
def build_context(input_data, user_message: str) -> str:
    """Give agent context about current state."""
    state = getattr(input_data, "state", {})

    if state:
        return f"Current state: {json.dumps(state)}\n\nUser: {user_message}"

    return user_message

config = StrandsAgentConfig(state_context_builder=build_context)
```

### Pattern: Force Agent to Call Tool

```python
def build_context(input_data, user_message: str) -> str:
    state = getattr(input_data, "state", {})

    # Detect placeholder data
    if state.get("data") == "PLACEHOLDER":
        return "IMPORTANT: Call fetch_data tool immediately.\n\n" + user_message

    return user_message

system_prompt = """When user asks about X, you MUST call the tool.
Do NOT use cached or initial state values."""
```

---

## 🔍 Debugging Checklist

### ✅ State Not Updating?

```python
# 1. Add logging
async def extract_state(context):
    print("🔥 CALLBACK CALLED!")
    print(f"Type: {type(context.result_data)}")
    print(f"Data: {context.result_data}")

    state = {...}
    print(f"✅ Returning: {state}")
    return state
```

```typescript
// 2. Log in frontend
useEffect(() => {
  console.log("State updated:", state);
}, [state]);
```

**Check:**
- [ ] Callback is called (see 🔥 in logs)
- [ ] State is returned (see ✅ in logs)
- [ ] Agent names match (backend & frontend)
- [ ] Frontend receives update (browser console)

### ✅ Agent Not Calling Tool?

```python
# Make prompt VERY explicit
system_prompt = """CRITICAL INSTRUCTION:
When user asks about their account, you MUST call use_aws.
Do NOT answer from memory or initial state."""

# Detect placeholder data
def build_context(input_data, user_message):
    if state.get("accountId") == "123456789012":  # Placeholder
        return "You MUST call the tool to get real data.\n\n" + user_message
    return user_message
```

### ✅ JSON Parse Error?

```python
# Python dicts use single quotes, JSON needs double quotes
json_str = result.replace("'", '"')
data = json.loads(json_str)
```

---

## 📊 Context Object Reference

### ToolResultContext (state_from_result)

```python
async def extract_from_result(context):
    context.result_data      # Tool return value (str, dict, etc.)
    context.tool_input       # Arguments passed to tool
    context.tool_name        # Name of the tool
    context.tool_use_id      # Unique ID for this tool call
    context.message_id       # Message ID
    context.input_data       # Full RunAgentInput
```

### ToolCallContext (state_from_args)

```python
async def extract_from_args(context):
    context.tool_input       # Arguments passed to tool
    context.args_str         # JSON string of arguments
    context.tool_name        # Name of the tool
    context.tool_use_id      # Unique ID for this tool call
    context.input_data       # Full RunAgentInput
```

---

## 🎯 StatePayload Format

**What to Return:**

```python
# ✅ Good - dict with any structure
return {
    "account_info": {"id": "123", "name": "test"},
    "items": ["a", "b", "c"],
    "settings": {"theme": "dark"}
}

# ✅ Good - nested dicts
return {
    "user": {
        "profile": {"name": "Alice"},
        "preferences": {"lang": "en"}
    }
}

# ❌ Bad - None skips state update
return None

# ❌ Bad - Empty dict might not trigger update
return {}
```

**Frontend Access:**

```typescript
const { state } = useCoAgent({
  name: "agent",
  initialState: {
    account_info: { id: "", name: "" },
    items: [],
    settings: {}
  }
});

// Access
state.account_info.id
state.items[0]
state.settings.theme
```

---

## 🛠️ ToolBehavior Options

```python
ToolBehavior(
    # Extract state from tool INPUT (before execution)
    state_from_args=callback,

    # Extract state from tool OUTPUT (after execution)
    state_from_result=callback,

    # Don't save messages to history
    skip_messages_snapshot=False,

    # Continue agent after frontend tool
    continue_after_frontend_call=False,

    # Stop text streaming after tool result
    stop_streaming_after_result=False,

    # Stream tool arguments incrementally
    args_streamer=callback,

    # Custom result processing
    custom_result_handler=callback,

    # Predictive state updates
    predict_state=[PredictStateMapping(...)],
)
```

---

## 🔗 Name Matching (CRITICAL!)

All three must use the **exact same name**:

```python
# Backend
agui_agent = StrandsAgent(
    agent=agent,
    name="my_agent",  # ← MUST MATCH
    config=config,
)
```

```typescript
// Frontend Component
const { state } = useCoAgent({
  name: "my_agent",  // ← MUST MATCH
  initialState: {...}
});
```

```typescript
// Frontend Runtime
const runtime = new CopilotRuntime({
  agents: {
    my_agent: new HttpAgent({...})  // ← MUST MATCH
  }
});
```

```typescript
// Layout
<CopilotKit agent="my_agent">  {/* ← MUST MATCH */}
```

---

## 🧪 Testing State Flow

### 1. Test Backend

```bash
# Run backend
cd agent && python main.py

# Test endpoint
curl http://localhost:8000/test
```

### 2. Test State Callback

```python
async def extract_state(context):
    # Add test return
    return {"test": "Hello from backend!"}
```

### 3. Test Frontend

```typescript
// Manual state update
const { setState } = useCoAgent({...});

<button onClick={() => setState({ test: "manual" })}>
  Test State
</button>
```

### 4. Test Full Flow

1. Ask agent a question
2. Check backend logs for 🔥
3. Check browser console for state update
4. Verify UI renders new state

---

## 📝 Minimal Working Example

**Backend (`agent/main.py`):**

```python
from ag_ui_strands import StrandsAgent, StrandsAgentConfig, ToolBehavior, create_strands_app
from strands import Agent, tool
from strands.models.bedrock import BedrockModel

@tool
def get_data(query: str):
    """Fetch data."""
    return f"Data for {query}"

async def extract(context):
    return {"result": str(context.result_data)}

model = BedrockModel(model_id="us.anthropic.claude-opus-4-5-20251101-v1:0")
agent = Agent(model=model, tools=[get_data])

agui_agent = StrandsAgent(
    agent=agent,
    name="test_agent",
    config=StrandsAgentConfig(
        tool_behaviors={"get_data": ToolBehavior(state_from_result=extract)}
    )
)

app = create_strands_app(agui_agent, "/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", port=8000)
```

**Frontend (`src/app/page.tsx`):**

```typescript
"use client";
import { useCoAgent } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";

export default function Page() {
  const { state } = useCoAgent({
    name: "test_agent",
    initialState: { result: "" }
  });

  return (
    <CopilotSidebar defaultOpen>
      <div className="p-6">
        <h1>Result: {state.result || "Ask me something!"}</h1>
      </div>
    </CopilotSidebar>
  );
}
```

**Runtime (`src/app/api/copilotkit/route.ts`):**

```typescript
import { CopilotRuntime, ExperimentalEmptyAdapter, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";

const runtime = new CopilotRuntime({
  agents: { test_agent: new HttpAgent({ url: "http://localhost:8000" }) }
});

export const POST = async (req) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit"
  });
  return handleRequest(req);
};
```

**Run:**
```bash
# Terminal 1
cd agent && python main.py

# Terminal 2
npm run dev

# Browser: http://localhost:3000
# Ask: "Get data for users"
# UI should update with: "Result: Data for users"
```

---

## 🎓 Key Takeaways

1. **`state_from_result`** = Extract state AFTER tool executes
2. **`state_from_args`** = Extract state BEFORE tool executes
3. **Agent names must match** everywhere (backend, frontend, runtime)
4. **Log everything** during debugging
5. **Handle different result types** (string, dict, etc.)
6. **Return dict from callbacks** or None to skip
7. **Frontend subscribes with `useCoAgent`**
8. **State updates trigger React re-renders**

---

*See [AG_UI_INTEGRATION_GUIDE.md](./AG_UI_INTEGRATION_GUIDE.md) for full documentation*