"""Base tool interface and result contracts for AI Assistant."""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from app.modules.user.domain.models import User
from app.modules.ai.llm.base import ToolDeclaration


class BaseAITool(ABC):
    """Abstract Base Class for controlled AI assistant tools."""

    @property
    @abstractmethod
    def declaration(self) -> ToolDeclaration:
        """Returns the typed tool declaration schema for LLM function calling."""
        pass

    @abstractmethod
    def execute(self, user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the tool with validated arguments and enforced user authorization."""
        pass
