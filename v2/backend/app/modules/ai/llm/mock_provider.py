"""Deterministic Mock LLM Provider for unit, integration tests, and offline execution."""

import uuid
from typing import Dict, Any, List, Optional
from app.modules.ai.llm.base import (
    LLMProvider,
    LLMMessage,
    LLMResponse,
    ToolDeclaration,
    ToolCallRequest,
)


class MockLLMProvider(LLMProvider):
    """Deterministic Mock LLM provider that simulates travel advisor intelligence and tool invocation."""

    def __init__(
        self,
        custom_responses: Optional[Dict[str, str]] = None,
        force_tool_call: Optional[ToolCallRequest] = None,
    ):
        self.custom_responses = custom_responses or {}
        self.force_tool_call = force_tool_call
        self.recorded_calls: List[Dict[str, Any]] = []

    def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        self.recorded_calls.append({"prompt": prompt, "system_instruction": system_instruction})
        for pattern, reply in self.custom_responses.items():
            if pattern.lower() in prompt.lower():
                return LLMResponse(content=reply, model_name="mock-gemini-v2")

        return LLMResponse(
            content="Welcome to Namma Connect! I can help you discover verified organic farm stays and rural experiences across Karnataka.",
            model_name="mock-gemini-v2",
            tokens_used=25,
        )

    def chat(
        self,
        messages: List[LLMMessage],
        system_instruction: Optional[str] = None,
        tools: Optional[List[ToolDeclaration]] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        last_message = messages[-1].content if messages else ""
        self.recorded_calls.append({
            "messages": [m.content for m in messages],
            "system_instruction": system_instruction,
            "tools": [t.name for t in tools] if tools else [],
        })

        if self.force_tool_call:
            return LLMResponse(
                content="I will search the marketplace for you.",
                tool_calls=[self.force_tool_call],
                model_name="mock-gemini-v2",
            )

        # Check for tool triggering patterns
        lower_msg = last_message.lower()

        # If user asks to search or mention places like Coorg, Chikkamagaluru, Kabini
        if any(w in lower_msg for w in ["search", "find", "stay", "coorg", "chikkamagaluru", "kabini", "farm", "tour"]):
            # Simulate calling search_services tool
            district = "Kodagu" if "coorg" in lower_msg else ("Chikkamagaluru" if "chik" in lower_msg else None)
            return LLMResponse(
                content="Let me look up the best available experiences for you.",
                tool_calls=[
                    ToolCallRequest(
                        id=str(uuid.uuid4()),
                        name="search_services",
                        arguments={"district": district, "query": last_message},
                    )
                ],
                model_name="mock-gemini-v2",
            )

        # If user asks for recommendations
        if any(w in lower_msg for w in ["recommend", "suggest", "popular", "top rated"]):
            return LLMResponse(
                content="Let me retrieve your personalized recommendations.",
                tool_calls=[
                    ToolCallRequest(
                        id=str(uuid.uuid4()),
                        name="get_user_recommendations",
                        arguments={"limit": 5},
                    )
                ],
                model_name="mock-gemini-v2",
            )

        # Check custom response matches
        for pattern, reply in self.custom_responses.items():
            if pattern.lower() in lower_msg:
                return LLMResponse(content=reply, model_name="mock-gemini-v2")

        # Default conversational response
        return LLMResponse(
            content=f"I'm here to help you plan your journey across Karnataka. You can ask me to search for farm stays, recommend local spice tours, or check real-time availability.",
            model_name="mock-gemini-v2",
            tokens_used=30,
        )
