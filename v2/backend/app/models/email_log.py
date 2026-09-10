"""Email Log SQLAlchemy Model."""

import uuid
from sqlalchemy import Column, String, Text, ForeignKey, Index
from app.models.base import Base, TimestampMixin, GUID


class EmailLog(Base, TimestampMixin):
    """Authoritative transactional email dispatch audit log."""

    __tablename__ = "email_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    recipient = Column(String(255), nullable=False, index=True)
    event_type = Column(String(50), nullable=False, index=True)  # verification, booking, payment, etc.
    subject = Column(String(255), nullable=False)
    resend_message_id = Column(String(128), nullable=True)
    status = Column(String(32), nullable=False, default="sent")  # sent, mock_sent, failed, skipped
    error = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_email_log_recipient_created", "recipient", "created_at"),
    )
