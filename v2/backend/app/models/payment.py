"""Payment database model for Transaction Records and Gateway Ledgers."""

import uuid
from sqlalchemy import Column, String, Float, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.models.base import Base, GUID, TimestampMixin


class Payment(Base, TimestampMixin):
    """Authoritative Payment Model for Razorpay transactions."""

    __tablename__ = "payments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    booking_id = Column(GUID(), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Razorpay Gateway Identifiers
    razorpay_order_id = Column(String(128), nullable=False, index=True)
    razorpay_payment_id = Column(String(128), nullable=True, index=True)
    razorpay_signature = Column(String(256), nullable=True)

    # Financial breakdown
    amount = Column(Float, nullable=False)  # in INR (e.g. 5600.0)
    currency = Column(String(10), nullable=False, default="INR")
    status = Column(String(32), nullable=False, default="PENDING", index=True)  # PENDING, PROCESSING, PAID, FAILED, CANCELLED

    # ORM Relationships
    booking = relationship("Booking", backref="payments")
    customer = relationship("User", backref="payments")

    __table_args__ = (
        Index("idx_booking_payments", "booking_id", "status"),
        Index("idx_customer_payments", "customer_id", "status"),
    )
