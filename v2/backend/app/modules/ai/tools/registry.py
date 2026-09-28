"""Tool registry managing tool declarations, discovery, and authorized execution."""

from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.modules.user.domain.models import User
from app.modules.ai.llm.base import ToolDeclaration
from app.modules.ai.tools.base import BaseAITool
from app.modules.ai.tools.marketplace_tools import (
    SearchServicesTool,
    GetServiceDetailsTool,
    GetServiceAvailabilityTool,
    GetCategoriesTool,
)
from app.modules.ai.tools.recommendation_tools import (
    GetUserRecommendationsTool,
)
from app.modules.ai.tools.user_context_tools import (
    GetUserSavedServicesTool,
    GetUserTripsTool,
)


class AIToolRegistry:
    """Central registry of approved backend tools for AI Assistant."""

    def __init__(self, db: Session):
        self.db = db
        self._tools: Dict[str, BaseAITool] = {}
        self._register_default_tools()

    def _register_default_tools(self):
        tools = [
            SearchServicesTool(self.db),
            GetServiceDetailsTool(self.db),
            GetServiceAvailabilityTool(self.db),
            GetCategoriesTool(self.db),
            GetUserRecommendationsTool(self.db),
            GetUserSavedServicesTool(self.db),
            GetUserTripsTool(self.db),
        ]
        for t in tools:
            self._tools[t.declaration.name] = t

    def get_declarations(self) -> List[ToolDeclaration]:
        """Return tool declaration schemas for LLM function calling."""
        return [t.declaration for t in self._tools.values()]

    def execute_tool(self, name: str, user: User, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Safely execute registered tool with authorized user context."""
        tool = self._tools.get(name)
        if not tool:
            return {"error": f"Tool '{name}' is not recognized or supported."}
        try:
            return tool.execute(user=user, arguments=arguments)
        except Exception as exc:
            return {"error": f"Tool execution failed: {str(exc)}"}
