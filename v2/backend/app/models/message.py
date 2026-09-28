"""Compatibility re-export for Messaging models."""
from app.modules.messaging.domain.models import Conversation, Message

__all__ = ["Conversation", "Message"]
