"""AI Assistant Domain Models (Conversations & Multi-Turn Messages)."""

import uuid
from sqlalchemy import (
    Column,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.models.base import Base, GUID, TimestampMixin
from app.core.enums import AIContextType, AIMessageRole


class AIConversation(Base, TimestampMixin):
    """AI Assistant Conversation Session (Separate from direct user messaging)."""

    __tablename__ = "ai_conversations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(255), nullable=False, default="New Conversation")
    context_type = Column(String(50), nullable=False, default=AIContextType.TRAVEL.value)

    # Relationships
    messages = relationship(
        "AIMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="AIMessage.created_at",
    )
    user = relationship("User")

    __table_args__ = (
        Index("idx_ai_conv_user_updated", "user_id", "updated_at"),
    )


class AIMessage(Base, TimestampMixin):
    """Single Turn Message in an AI Assistant Conversation."""

    __tablename__ = "ai_messages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(GUID(), ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(32), nullable=False, default=AIMessageRole.USER.value)
    content = Column(Text, nullable=False)
    intent = Column(String(64), nullable=True)
    metadata_json = Column(Text, nullable=False, default="{}")

    # Relationships
    conversation = relationship("AIConversation", back_populates="messages")

    __table_args__ = (
        Index("idx_ai_msg_conv_created", "conversation_id", "created_at"),
    )
