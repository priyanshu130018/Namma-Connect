"""Booking presentation schemas."""

from typing import Optional
from datetime import date
from pydantic import BaseModel, Field


class BookingCreateRequest(BaseModel):
    service_id: str
    start_date: date
    end_date: Optional[date] = None
    slot_time: Optional[str] = None
    guests_count: int = Field(1, ge=1, le=100)
    special_requests: Optional[str] = None


class BookingStatusUpdateRequest(BaseModel):
    status: str
    reason: Optional[str] = None


class BookingCancelRequest(BaseModel):
    reason: str = Field(..., min_length=3)


class BookingResponse(BaseModel):
    id: str
    booking_number: str
    user_id: str
    service_id: str
    provider_id: str
    start_date: str
    end_date: Optional[str] = None
    slot_time: Optional[str] = None
    guests_count: int
    unit_price: float
    total_price: float
    tax_amount: float
    platform_fee: float
    final_amount: float
    currency: str
    status: str
    payment_status: str
    special_requests: Optional[str] = None
    cancellation_reason: Optional[str] = None
    cancelled_at: Optional[str] = None
    created_at: str
    updated_at: str
