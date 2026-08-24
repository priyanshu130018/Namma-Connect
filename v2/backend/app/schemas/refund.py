"""Pydantic schemas for Refunds and Reversals."""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class RefundResponse(BaseModel):
    id: str
    refund_code: str
    booking_id: str
    payment_id: Optional[str] = None
    customer_id: str
    amount: float
    currency: str = "INR"
    status: str  # PENDING, PROCESSING, COMPLETED, FAILED, NOT_ELIGIBLE
    razorpay_refund_id: Optional[str] = None
    reason: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RefundListResponse(BaseModel):
    refunds: List[RefundResponse]
    total: int
