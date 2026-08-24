"""Pydantic schemas for Payment Requests, Razorpay Order Responses, and Verification."""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class PaymentOrderCreateRequest(BaseModel):
    booking_id: str = Field(..., description="Target booking ID or code")


class PaymentOrderResponse(BaseModel):
    order_id: str
    amount: float
    amount_paise: int
    currency: str = "INR"
    key_id: str
    booking_id: str
    booking_code: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    service_title: str

    model_config = ConfigDict(from_attributes=True)


class PaymentVerifyRequest(BaseModel):
    booking_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentVerificationResponse(BaseModel):
    success: bool
    message: str
    booking_id: str
    booking_code: str
    status: str  # CONFIRMED
    payment_id: str
    amount: float
    verified_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
