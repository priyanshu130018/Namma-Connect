"""Booking Domain Model for Customer Transactions and Reservations."""

import uuid
from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.models.base import Base, GUID, TimestampMixin
from app.core.enums import BookingStatus


class Booking(Base, TimestampMixin):
    """Authoritative Customer Booking Transaction Entity."""

    __tablename__ = "bookings"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    booking_code = Column(String(32), unique=True, nullable=False, index=True)

    # Normalized Foreign Keys
    customer_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(GUID(), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Schedule metadata
    start_date = Column(String(32), nullable=False)  # YYYY-MM-DD
    end_date = Column(String(32), nullable=True)    # YYYY-MM-DD for multi-night stays
    time_slot_id = Column(String(64), nullable=True)
    time_slot_label = Column(String(128), nullable=True)

    # Guest count and reservation state
    guest_count = Column(Integer, nullable=False, default=1)
    status = Column(String(32), nullable=False, default=BookingStatus.PENDING.value, index=True)

    # Financial calculations (NUMERIC 12,2 for precise monetary amounts)
    unit_price = Column(Numeric(12, 2), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)

    # Notes & audit flags
    special_requests = Column(Text, nullable=True)
    is_test_data = Column(Boolean, nullable=False, default=False, index=True)

    # ORM Relationships
    customer = relationship("User", foreign_keys=[customer_id], backref="bookings")
    service = relationship("Service", backref="bookings")
    review = relationship("Review", back_populates="booking", uselist=False)
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")
    refunds = relationship("Refund", backref="booking", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_customer_bookings", "customer_id", "status", "created_at"),
        Index("idx_provider_bookings", "provider_id", "status"),
    )
