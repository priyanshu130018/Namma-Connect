"""Context builder for conversational memory and user preferences."""

from typing import List, Dict, Any, Optional
from app.modules.user.domain.models import User
from app.modules.ai.domain.models import AIMessage
from app.modules.ai.llm.base import LLMMessage


class ContextBuilder:
    """Constructs bounded multi-turn conversation memory and structured user context."""

    MAX_HISTORY_MESSAGES: int = 10

    @classmethod
    def build_llm_messages(
        cls,
        history: List[AIMessage],
        current_message: str,
        user: Optional[User] = None,
        tool_results_summary: Optional[str] = None,
    ) -> List[LLMMessage]:
        """Format bounded history, user background, and tool context for LLM execution."""
        messages: List[LLMMessage] = []

        # User profile context if available
        if user:
            user_context = f"[Context: Traveler Name: {user.full_name}, Role: {user.role}]"
            messages.append(LLMMessage(role="system", content=user_context))

        # Recent conversation history (bounded to last N turns)
        recent_history = history[-cls.MAX_HISTORY_MESSAGES:] if history else []
        for msg in recent_history:
            role = "assistant" if msg.role in ["assistant", "model"] else "user"
            messages.append(LLMMessage(role=role, content=msg.content))

        # If backend tools were executed, inject authoritative factual context
        if tool_results_summary:
            tool_msg = (
                f"[Authoritative Backend Tool Results - You must use only these verified facts in your answer]:\n"
                f"{tool_results_summary}"
            )
            messages.append(LLMMessage(role="system", content=tool_msg))

        # Current user query
        messages.append(LLMMessage(role="user", content=current_message))

        return messages
