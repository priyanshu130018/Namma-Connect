"""Notification Domain Models (In-App Notifications and Email Audit Logs)."""

import uuid
from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.models.base import Base, GUID, TimestampMixin
from app.core.enums import NotificationType


class Notification(Base, TimestampMixin):
    """Database-backed in-app user notifications."""

    __tablename__ = "notifications"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), nullable=False, default=NotificationType.BOOKING.value, index=True)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    is_deletable = Column(Boolean, nullable=False, default=True)
    action_url = Column(String(500), nullable=True)
    metadata_json = Column(Text, nullable=False, default="{}")
    is_test_data = Column(Boolean, nullable=False, default=False, index=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="notifications")

    __table_args__ = (
        Index("idx_user_notifications_read", "user_id", "is_read", "created_at"),
    )


class EmailLog(Base, TimestampMixin):
    """Audit ledger of transactional emails dispatched through Resend API."""

    __tablename__ = "email_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    recipient = Column(String(255), nullable=False, index=True)
    event_type = Column(String(100), nullable=True, index=True)
    template = Column(String(100), nullable=True, index=True)
    subject = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="SENT")  # SENT, FAILED, RETRIED
    provider_message_id = Column(String(255), nullable=True)
    resend_message_id = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
