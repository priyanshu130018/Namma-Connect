"""Messaging Domain Models (Conversations and Direct Messages between Users and Providers)."""

import uuid
from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.models.base import Base, GUID, TimestampMixin


class Conversation(Base, TimestampMixin):
    """Direct conversation channel between two participants (Traveler and Host)."""

    __tablename__ = "conversations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    participant1_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    participant1_name = Column(String(255), nullable=False)
    participant2_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    participant2_name = Column(String(255), nullable=False)

    subject = Column(String(255), nullable=True)
    last_message_text = Column(Text, nullable=True)
    last_message_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    unread_count_p1 = Column(Integer, nullable=False, default=0)
    unread_count_p2 = Column(Integer, nullable=False, default=0)

    # Relationships
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    __table_args__ = (
        Index("idx_conversation_participants", "participant1_id", "participant2_id"),
        Index("idx_conversation_last_msg", "last_message_at"),
    )


class Message(Base, TimestampMixin):
    """Single message entry within a direct conversation."""

    __tablename__ = "messages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(GUID(), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_name = Column(String(255), nullable=False)
    content = Column(Text, nullable=False, default="")
    text = Column(Text, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")

    __table_args__ = (
        Index("idx_message_conv_created", "conversation_id", "created_at"),
    )
