"""Payment Domain Models for Financial Transactions, Gateway Ledgers, Refunds, and Payouts."""

import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.models.base import Base, GUID, TimestampMixin
from app.core.enums import PaymentStatus, RefundStatus, PayoutStatus


class Payment(Base, TimestampMixin):
    """Authoritative Payment Record for Razorpay Gateway Transactions."""

    __tablename__ = "payments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    booking_id = Column(GUID(), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Razorpay Gateway Identifiers
    razorpay_order_id = Column(String(128), nullable=False, index=True)
    razorpay_payment_id = Column(String(128), nullable=True, index=True)
    razorpay_signature = Column(String(256), nullable=True)

    # Financial details (NUMERIC 12,2 for precise currency calculation)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    status = Column(String(32), nullable=False, default=PaymentStatus.PENDING.value, index=True)
    is_test_data = Column(Boolean, nullable=False, default=False, index=True)

    # Relationships
    booking = relationship("Booking", back_populates="payments")
    customer = relationship("User", foreign_keys=[customer_id], backref="payments")
    refunds = relationship("Refund", back_populates="payment", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_booking_payments", "booking_id", "status"),
        Index("idx_customer_payments", "customer_id", "status"),
    )


class Refund(Base, TimestampMixin):
    """Refund transaction ledger for cancelled bookings."""

    __tablename__ = "refunds"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    refund_code = Column(String(50), unique=True, nullable=True, index=True)
    payment_id = Column(GUID(), ForeignKey("payments.id", ondelete="CASCADE"), nullable=True, index=True)
    booking_id = Column(GUID(), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    razorpay_refund_id = Column(String(128), nullable=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    reason = Column(Text, nullable=True)
    failure_reason = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default=RefundStatus.PENDING.value, index=True)
    processed_at = Column(DateTime, nullable=True)
    is_test_data = Column(Boolean, nullable=False, default=False, index=True)

    # Relationships
    payment = relationship("Payment", back_populates="refunds")


class Payout(Base, TimestampMixin):
    """Provider disbursement records and payout requests."""

    __tablename__ = "payouts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    provider_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    payout_code = Column(String(50), unique=True, nullable=False, index=True)

    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    beneficiary_name = Column(String(255), nullable=True)
    bank_account_number = Column(String(50), nullable=True)
    bank_account_last4 = Column(String(10), nullable=True)
    bank_ifsc = Column(String(20), nullable=True)
    ifsc_code = Column(String(20), nullable=True)
    status = Column(String(32), nullable=False, default=PayoutStatus.PENDING.value, index=True)
    failure_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    is_test_data = Column(Boolean, nullable=False, default=False, index=True)

    # Relationships
    provider = relationship("User", foreign_keys=[provider_id], backref="payouts")
