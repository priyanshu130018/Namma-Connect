"""Google Gemini LLM Provider adapter."""

import json
import uuid
from typing import Dict, Any, List, Optional
import httpx

from app.core.config import settings
from app.core.logging import logger
from app.modules.ai.llm.base import (
    LLMProvider,
    LLMMessage,
    LLMResponse,
    ToolDeclaration,
    ToolCallRequest,
)


class GeminiProvider(LLMProvider):
    """Google Gemini adapter using HTTP API / configured Gemini endpoints."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout_seconds: float = 30.0,
    ):
        self.api_key = api_key or getattr(settings, "GEMINI_API_KEY", "")
        self.model_name = model_name or getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")
        self.timeout_seconds = timeout_seconds

    def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        messages = [LLMMessage(role="user", content=prompt)]
        return self.chat(
            messages=messages,
            system_instruction=system_instruction,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def chat(
        self,
        messages: List[LLMMessage],
        system_instruction: Optional[str] = None,
        tools: Optional[List[ToolDeclaration]] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        if not self.api_key:
            # Graceful offline fallback
            logger.warning("[GeminiProvider] GEMINI_API_KEY is not configured; returning fallback response.")
            return LLMResponse(
                content="I am currently operating in offline mode. Please configure GEMINI_API_KEY for live generative responses.",
                model_name=self.model_name,
                tokens_used=20,
            )

        # Build contents payload
        contents = []
        for m in messages:
            role = "model" if m.role in ["assistant", "model"] else "user"
            contents.append({
                "role": role,
                "parts": [{"text": m.content}],
            })

        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }

        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}],
            }

        # Add tools declaration if provided
        if tools:
            function_declarations = [t.to_dict() for t in tools]
            payload["tools"] = [{"functionDeclarations": function_declarations}]

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                resp = client.post(url, json=payload)
                if resp.status_code != 200:
                    logger.error(f"[GeminiProvider] API Error {resp.status_code}: {resp.text}")
                    return LLMResponse(
                        content="I encountered a temporary issue contacting the travel advisor service. Please try again shortly.",
                        model_name=self.model_name,
                    )

                data = resp.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    return LLMResponse(content="", model_name=self.model_name)

                first_candidate = candidates[0]
                content_parts = first_candidate.get("content", {}).get("parts", [])

                text_response = ""
                tool_calls = []

                for part in content_parts:
                    if "text" in part:
                        text_response += part["text"]
                    elif "functionCall" in part:
                        fn = part["functionCall"]
                        tool_calls.append(
                            ToolCallRequest(
                                id=str(uuid.uuid4()),
                                name=fn.get("name", ""),
                                arguments=fn.get("args", {}),
                            )
                        )

                usage = data.get("usageMetadata", {})
                tokens = usage.get("totalTokenCount", len(text_response.split()))

                return LLMResponse(
                    content=text_response,
                    tool_calls=tool_calls,
                    model_name=self.model_name,
                    tokens_used=tokens,
                    raw_response=data,
                )
        except Exception as exc:
            logger.error(f"[GeminiProvider] Request failed: {exc}")
            return LLMResponse(
                content="I'm having trouble connecting to the intelligence engine. Let me help you find top experiences in Karnataka directly.",
                model_name=self.model_name,
            )
