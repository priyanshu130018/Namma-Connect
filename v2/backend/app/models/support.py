"""Support Ticket SQLAlchemy Model."""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from app.models.base import Base, TimestampMixin, GUID


class SupportTicket(Base, TimestampMixin):
    """Authoritative Customer Support Ticket Model."""

    __tablename__ = "support_tickets"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    ticket_code = Column(String(50), nullable=False, unique=True, index=True)

    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_name = Column(String(255), nullable=False)
    user_email = Column(String(255), nullable=False)

    booking_id = Column(String(255), nullable=True, index=True)
    category = Column(String(100), nullable=False)  # Booking, Payment, Cancellation, Refund, Account, Service, Other
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    status = Column(String(50), nullable=False, default="OPEN", index=True)  # OPEN, IN_PROGRESS, RESOLVED, CLOSED
    priority = Column(String(50), nullable=False, default="MEDIUM")  # LOW, MEDIUM, HIGH, URGENT

    responses_json = Column(Text, nullable=False, default="[]")  # JSON list of reply objects
    resolved_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_support_user_status", "user_id", "status"),
        Index("idx_support_category", "category"),
    )
