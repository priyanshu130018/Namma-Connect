"""Abstract LLM Provider interface, data contracts, and tool definitions."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional


@dataclass
class ToolParameter:
    name: str
    type: str
    description: str
    required: bool = True
    enum: Optional[List[str]] = None


@dataclass
class ToolDeclaration:
    name: str
    description: str
    parameters: List[ToolParameter] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        properties = {}
        required_fields = []
        for p in self.parameters:
            prop_def: Dict[str, Any] = {
                "type": p.type,
                "description": p.description,
            }
            if p.enum:
                prop_def["enum"] = p.enum
            properties[p.name] = prop_def
            if p.required:
                required_fields.append(p.name)

        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required_fields,
            },
        }


@dataclass
class LLMMessage:
    role: str  # "system", "user", "assistant", "tool"
    content: str
    name: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None


@dataclass
class ToolCallRequest:
    id: str
    name: str
    arguments: Dict[str, Any]


@dataclass
class LLMResponse:
    content: str
    tool_calls: List[ToolCallRequest] = field(default_factory=list)
    model_name: str = ""
    tokens_used: int = 0
    finish_reason: str = "stop"
    raw_response: Optional[Dict[str, Any]] = None


class LLMProvider(ABC):
    """Abstract Interface for LLM Providers (Gemini, Mock, etc.)."""

    @abstractmethod
    def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        """Single-turn text generation."""
        pass

    @abstractmethod
    def chat(
        self,
        messages: List[LLMMessage],
        system_instruction: Optional[str] = None,
        tools: Optional[List[ToolDeclaration]] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        """Multi-turn conversation with optional tool declarations."""
        pass
