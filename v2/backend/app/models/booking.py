"""Booking database model for Customer Reservations."""

import uuid
from sqlalchemy import Column, String, Text, Float, Integer, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.models.base import Base, GUID, TimestampMixin


class Booking(Base, TimestampMixin):
    """Authoritative Customer Booking Model."""

    __tablename__ = "bookings"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    booking_code = Column(String(32), unique=True, nullable=False, index=True)

    # Relationship foreign keys
    customer_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(GUID(), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id = Column(GUID(), nullable=True, index=True)

    # Schedule metadata
    start_date = Column(String(32), nullable=False)  # YYYY-MM-DD
    end_date = Column(String(32), nullable=True)  # YYYY-MM-DD for multi-night stays
    time_slot_id = Column(String(64), nullable=True)
    time_slot_label = Column(String(128), nullable=True)  # e.g. "09:00 AM - 12:30 PM"

    # Guest count and reservation details
    guest_count = Column(Integer, nullable=False, default=1)
    status = Column(String(32), nullable=False, default="PENDING", index=True)  # PENDING, CONFIRMED, CANCELLED, COMPLETED

    # Financial breakdown (Authoritative calculated values)
    unit_price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)

    # Customer notes
    special_requests = Column(Text, nullable=True)
    is_test_data = Column(Boolean, nullable=False, default=False, index=True)

    # ORM Relationships
    customer = relationship("User", backref="bookings")
    service = relationship("Service", backref="bookings")
    review = relationship("Review", backref="booking", uselist=False)

    __table_args__ = (
        Index("idx_customer_bookings", "customer_id", "status", "created_at"),
    )
