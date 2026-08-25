"""Payout database model for Provider Disbursements and Bank Settlements."""

import uuid
from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Text, Index
from sqlalchemy.orm import relationship
from app.models.base import Base, GUID, TimestampMixin


class Payout(Base, TimestampMixin):
    """Authoritative Payout Model for provider bank transfers and settlement reconciliation."""

    __tablename__ = "payouts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    payout_code = Column(String(64), nullable=False, unique=True, index=True)
    provider_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Financial breakdown
    amount = Column(Float, nullable=False)  # in INR (e.g. 5320.0)
    currency = Column(String(10), nullable=False, default="INR")
    status = Column(String(32), nullable=False, default="PENDING", index=True)  # PENDING, PROCESSING, COMPLETED, FAILED

    # Masked Bank/Settlement Reference
    beneficiary_name = Column(String(255), nullable=True)
    bank_account_last4 = Column(String(10), nullable=True)  # e.g. "4092"
    ifsc_code = Column(String(32), nullable=True)  # e.g. "SBIN0001234"
    failure_reason = Column(Text, nullable=True)
    processed_at = Column(DateTime, nullable=True)

    # ORM Relationships
    provider = relationship("User", backref="payouts")

    __table_args__ = (
        Index("idx_provider_payouts_status", "provider_id", "status"),
    )
