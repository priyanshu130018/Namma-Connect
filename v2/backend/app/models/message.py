"""Conversation and Message SQLAlchemy Models."""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, Index
from app.models.base import Base, TimestampMixin, GUID


class Conversation(Base, TimestampMixin):
    """Authoritative Conversation Thread between two participants."""

    __tablename__ = "conversations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    participant1_id = Column(GUID(), ForeignKey("users.id"), nullable=False, index=True)
    participant1_name = Column(String(255), nullable=False)

    participant2_id = Column(GUID(), ForeignKey("users.id"), nullable=False, index=True)
    participant2_name = Column(String(255), nullable=False)

    subject = Column(String(255), nullable=True)  # e.g., service or campaign title
    last_message_text = Column(Text, nullable=True)
    last_message_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    unread_count_p1 = Column(Integer, default=0, nullable=False)
    unread_count_p2 = Column(Integer, default=0, nullable=False)

    __table_args__ = (
        Index("idx_conversation_p1_p2", "participant1_id", "participant2_id"),
    )


class Message(Base, TimestampMixin):
    """Authoritative Individual Chat Message."""

    __tablename__ = "messages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(GUID(), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)

    sender_id = Column(GUID(), ForeignKey("users.id"), nullable=False, index=True)
    sender_name = Column(String(255), nullable=False)

    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        Index("idx_message_conv_created", "conversation_id", "created_at"),
    )
