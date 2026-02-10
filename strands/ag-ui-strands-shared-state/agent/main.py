"""Strands AG-UI Integration Example - Proverbs Agent.

This example demonstrates a Strands agent integrated with AG-UI, featuring:
- Shared state management between agent and UI
- Backend tool execution (get_weather, update_proverbs)
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
from strands_tools import use_aws

load_dotenv()

# define Agent state

class AccountInfo(BaseModel):
    """AWS Account information state."""

    accountId: str = Field(default="", description="AWS Account ID")
    userId: str = Field(default="", description="AWS User ID")
    arn: str = Field(default="", description="AWS User ARN")
    region: str = Field(default="", description="AWS Region")


def build_account_info_context(input_data, user_message: str) -> str:
    """Inject the current AWS account info state into the prompt.

    Note: We still instruct the agent to fetch fresh data even if state exists,
    to ensure we always have the latest information from AWS.
    """
    state_dict = getattr(input_data, "state", {}) or {}

    if state_dict and state_dict.get("agent_state"):
        # Check if this looks like placeholder/initial data
        account_id = state_dict.get("agent_state", {}).get("accountId", "")

        # If it's the placeholder data, explicitly ask to fetch fresh data
        if account_id == "123456789012":
            return (
                f"IMPORTANT: The current state contains placeholder data. "
                f"You MUST call use_aws to fetch real account information.\n\n"
                f"User request: {user_message}"
            )
        else:
            # We have real data, but still mention the tool is available
            account_info_json = json.dumps(state_dict, indent=2)
            return (
                f"Previous AWS account information (call use_aws to refresh):\n{account_info_json}\n\n"
                f"User request: {user_message}"
            )

    return f"No AWS account information available yet. Use the use_aws tool to fetch it.\n\nUser request: {user_message}"


async def return_account_info(context):
    """Extract AWS account info from use_aws tool results.

    This function parses the STS GetCallerIdentity response to extract
    account information and format it for frontend state.

    Args:
        context: ToolResultContext containing tool execution details
                - result_data: The ToolResult dict from use_aws
                - tool_input: The input arguments passed to use_aws

    Returns:
        dict: State snapshot with account info, or None on error
    """
    print("=" * 80)
    print("🔥 return_account_info CALLED!")
    print("=" * 80)

    try:
        # Get the tool result - can be a string or dict
        result = context.result_data

        print(f"DEBUG: Full result_data: {result}")
        print(f"DEBUG: result_data type: {type(result)}")

        # Handle different result formats
        text_content = None

        if isinstance(result, str):
            # result_data is directly the string content
            text_content = result
            print(f"DEBUG: result_data is string, using directly")
        elif isinstance(result, dict):
            # result_data is a dict, extract content
            content_list = result.get("content", [])
            if isinstance(content_list, list) and len(content_list) > 0:
                text_content = content_list[0].get("text", "")
                print(f"DEBUG: Extracted text from dict content")
            else:
                print(f"DEBUG: No content found in dict")
                return None
        else:
            print(f"DEBUG: Unexpected result_data type: {type(result)}")
            return None

        print(f"DEBUG: Extracted text: {text_content}")

        # Parse the "Success: {json}" format from use_aws
        if text_content and text_content.startswith("Success:"):
            json_str = text_content.replace("Success:", "").strip()

            # The string uses single quotes, need to convert to valid JSON
            # Replace single quotes with double quotes for JSON parsing
            json_str = json_str.replace("'", '"')

            response_data = json.loads(json_str)

            print(f"DEBUG: Parsed response: {response_data}")

            # Extract STS GetCallerIdentity response fields
            account_id = response_data.get("Account", "")
            user_id = response_data.get("UserId", "")
            arn = response_data.get("Arn", "")

            state = {
                "agent_state": {
                    "accountId": account_id,
                    "userId": user_id,
                    "arn": arn,
                    "region": context.tool_input.get("region", "us-west-2")
                }
            }

            print(f"DEBUG: Returning state: {state}")
            return state

        return None
    except Exception as e:
        print(f"Error extracting account info: {e}")
        import traceback
        traceback.print_exc()
        return None



# Configure agent behavior

account_info_state_config = StrandsAgentConfig(
    state_context_builder=build_account_info_context,
    tool_behaviors={
        "use_aws": ToolBehavior(
            skip_messages_snapshot=False,
            state_from_result=return_account_info,  # Extract from result, not args
        )
    },
)

# Initialize Bedrock  model
model = BedrockModel(
    model_id="us.anthropic.claude-opus-4-5-20251101-v1:0"
)
system_prompt = """You are a helpful AWS assistant that helps users interact with their AWS account.

CRITICAL INSTRUCTION: When users ask about their AWS account information (account ID, user ID, ARN, etc.),
you MUST call the use_aws tool to fetch fresh data from AWS. Do NOT use any cached or initial state values.

To get account information, ALWAYS use:
- service_name: 'sts'
- operation_name: 'get_caller_identity'
- parameters: {} (empty dict)
- region: 'us-east-1' (or user's preferred region)
- label: 'Get AWS Account Information'

Example: When asked "What is my account ID?", immediately call use_aws with the above parameters.

After calling use_aws, explain the results to the user in a clear and helpful manner.
"""

# Create Strands agent with tools
# Note: Frontend tools (set_theme_color, hitl_test) return None - actual execution happens in the UI
strands_agent = Agent(
    model=model,
    system_prompt=system_prompt,
    tools=[use_aws],
)

# Wrap with AG-UI integration
agui_agent = StrandsAgent(
    agent=strands_agent,
    name="strands_agent",
    description="An AWS assistant that helps you interact with your AWS account and retrieve account information",
    config=account_info_state_config,
)

# Create the FastAPI app
agent_path = os.getenv("AGENT_PATH", "/")
app = create_strands_app(agui_agent, agent_path)

if __name__ == "__main__":
    import uvicorn

    port  = int(os.getenv("AGENT_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
