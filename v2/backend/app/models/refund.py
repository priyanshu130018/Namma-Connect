"""Refund database model for Booking Cancellations and Reversals."""

import uuid
from sqlalchemy import Column, String, Float, ForeignKey, Index, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base, GUID, TimestampMixin


class Refund(Base, TimestampMixin):
    """Authoritative Refund Ledger Model."""

    __tablename__ = "refunds"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    refund_code = Column(String(64), nullable=False, unique=True, index=True)

    payment_id = Column(GUID(), ForeignKey("payments.id", ondelete="CASCADE"), nullable=True, index=True)
    booking_id = Column(GUID(), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    amount = Column(Float, nullable=False, default=0.0)  # Refund amount in INR
    currency = Column(String(10), nullable=False, default="INR")
    status = Column(String(32), nullable=False, default="PENDING", index=True)  # PENDING, PROCESSING, COMPLETED, FAILED, NOT_ELIGIBLE

    razorpay_refund_id = Column(String(128), nullable=True, index=True)
    reason = Column(String(255), nullable=True)
    failure_reason = Column(String(255), nullable=True)
    processed_at = Column(DateTime, nullable=True)

    # Relationships
    payment = relationship("Payment", backref="refunds")
    booking = relationship("Booking", backref="refunds")
    customer = relationship("User", backref="refunds")

    __table_args__ = (
        Index("idx_booking_refunds", "booking_id", "status"),
        Index("idx_customer_refunds", "customer_id", "status"),
    )
