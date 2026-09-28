"""Payment presentation schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class CreateOrderRequest(BaseModel):
    booking_id: str
    idempotency_key: Optional[str] = None


class CreateOrderResponse(BaseModel):
    payment_id: str
    payment_reference: str
    booking_id: str
    amount: float
    currency: str
    gateway_order_id: str
    key_id: Optional[str] = "rzp_test_nammaconnect"


class VerifyPaymentRequest(BaseModel):
    payment_id: str
    gateway_payment_id: str
    gateway_order_id: str
    gateway_signature: str


class PaymentResponse(BaseModel):
    id: str
    payment_reference: str
    booking_id: str
    user_id: str
    amount: float
    currency: str
    payment_method: Optional[str] = None
    gateway: str
    gateway_order_id: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class RefundRequest(BaseModel):
    payment_id: str
    amount: Optional[float] = None
    reason: str = Field(..., min_length=3)


class RefundResponse(BaseModel):
    id: str
    refund_reference: str
    payment_id: str
    booking_id: str
    amount: float
    currency: str
    status: str
    reason: Optional[str] = None
    created_at: str


class CreatePayoutRequest(BaseModel):
    provider_id: str
    amount: float = Field(..., gt=0)
    bank_account_info: Optional[str] = None


class PayoutResponse(BaseModel):
    id: str
    payout_reference: str
    provider_id: str
    amount: float
    currency: str
    status: str
    bank_account_info: Optional[str] = None
    gateway_payout_id: Optional[str] = None
    created_at: str
