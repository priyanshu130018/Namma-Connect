"""Support Domain Model for Customer & Provider Grievance Ticketing."""

import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
)
from app.models.base import Base, GUID, TimestampMixin
from app.core.enums import SupportTicketPriority, SupportTicketStatus


class SupportTicket(Base, TimestampMixin):
    """Customer and Host Support Grievance Ticket Model."""

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

    status = Column(String(50), nullable=False, default=SupportTicketStatus.OPEN.value, index=True)
    priority = Column(String(50), nullable=False, default=SupportTicketPriority.MEDIUM.value)

    responses_json = Column(Text, nullable=False, default="[]")
    resolved_at = Column(DateTime, nullable=True)
    is_test_data = Column(Boolean, nullable=False, default=False, index=True)
    is_synthetic = Column(Boolean, nullable=False, default=False, index=True)

    __table_args__ = (
        Index("idx_support_user_status", "user_id", "status"),
        Index("idx_support_category", "category"),
    )
