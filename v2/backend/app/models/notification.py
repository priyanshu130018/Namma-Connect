"""Notification SQLAlchemy Model."""

import uuid
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, Index
from app.models.base import Base, TimestampMixin, GUID


class Notification(Base, TimestampMixin):
    """Authoritative User Notification Record."""

    __tablename__ = "notifications"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), nullable=False, default="system")  # booking, payment, collaboration, payout, system
    resource_type = Column(String(50), nullable=True)  # booking, service, collaboration, payout
    resource_id = Column(String(255), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False, index=True)

    __table_args__ = (
        Index("idx_notification_user_read", "user_id", "is_read"),
        Index("idx_notification_user_created", "user_id", "created_at"),
    )
