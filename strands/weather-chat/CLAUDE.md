# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a starter template integrating [Strands](https://strands.com) agents with [CopilotKit](https://copilotkit.ai) for building AI-powered applications. The project demonstrates a weather assistant that fetches and displays current weather information using shared state between backend agent and frontend UI.

## Prerequisites

- Node.js 20+
- Python 3.12+ (but < 3.14)
- AWS credentials configured (for Bedrock access in us-east-1)
- Package manager: pnpm (recommended), npm, yarn, or bun

## Environment Setup

Ensure AWS credentials are configured in your environment. The agent uses AWS Bedrock with Claude 3.5 Sonnet in the us-east-1 region.

## Common Development Commands

Install dependencies (includes automatic Python agent setup via postinstall):
```bash
npm install
```

Start both UI and agent servers concurrently:
```bash
npm run dev
```

Start only the Next.js UI server (port 3000):
```bash
npm run dev:ui
```

Start only the Strands agent server (port 8000):
```bash
npm run dev:agent
```

Build the Next.js application:
```bash
npm run build
```

Run linting:
```bash
npm run lint
```

Manually install/update Python agent dependencies:
```bash
npm run install:agent
# Or directly:
cd agent && uv sync
```

## Architecture

### Two-Server Architecture

The application runs as two concurrent servers:

1. **Next.js UI Server** (port 3000): React frontend using Next.js App Router
2. **Strands Agent Server** (port 8000): FastAPI backend running the Python Strands agent

Communication flows: UI → Next.js API Route (`/api/copilotkit`) → Strands Agent (FastAPI)

### Key Integration Points

**Backend Agent** (`agent/main.py`):
- Strands agent wrapped with `StrandsAgent` and AG-UI integration
- Defines backend tools (executed in Python) and frontend tools (executed in browser)
- Uses `StrandsAgentConfig` for state management and tool behavior customization
- Exports a FastAPI app via `create_strands_app()`

**Frontend UI** (`src/app/page.tsx`):
- Uses CopilotKit React hooks for agent integration
- `useCoAgent`: Manages shared state between frontend and backend agent
- `useFrontendTool`: Handles frontend-only tool execution (e.g., `set_theme_color`)
- `useRenderToolCall`: Custom generative UI rendering for specific tools
- `useDefaultTool`: Default generative UI rendering for all other tools

**API Route** (`src/app/api/copilotkit/route.ts`):
- CopilotKit runtime setup connecting to the Strands agent
- Uses `HttpAgent` to communicate with FastAPI backend
- Configurable via `STRANDS_AGENT_URL` env var (defaults to `http://localhost:8000`)

### State Management Pattern

The codebase demonstrates state synchronization from backend to frontend:

1. **Backend → Frontend**: Agent uses `get_weather` tool with `state_from_result` callback to emit weather state snapshots to the UI
2. **Shared State Display**: Weather data is displayed both in the chat (via generative UI) and in the main component (via `useCoAgent` state)

### Tool Execution Models

**Backend Tools** (return data):
- `get_weather`: Executes in Python, fetches real weather data from Open-Meteo API, updates shared state via `state_from_result`, and renders generative UI in chat

**Frontend Tools** (return None):
- `set_theme_color`: Returns `None` in Python, actual execution via `useFrontendTool` in React

## File Structure

- `src/app/page.tsx`: Main UI component with CopilotKit sidebar and weather dashboard
- `src/app/api/copilotkit/route.ts`: Next.js API route connecting to Strands agent
- `src/components/weather.tsx`: Weather card component for generative UI rendering in chat
- `src/components/default-tool-ui.tsx`: Default tool UI component
- `agent/main.py`: Strands agent definition with weather tool and AG-UI configuration
- `agent/pyproject.toml`: Python dependencies (managed by `uv`)
- `scripts/`: Shell scripts for agent setup and execution

## Path Aliases

TypeScript uses `@/*` to reference `./src/*` directory.
