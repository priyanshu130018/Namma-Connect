"""Pydantic schemas for Booking requests, responses, and Provider management."""

from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class BookingCreateRequest(BaseModel):
    service_id: str = Field(..., description="Target service GUID or ID")
    start_date: str = Field(..., description="Check-in or experience start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="Check-out date for multi-night stays (YYYY-MM-DD)")
    time_slot_id: Optional[str] = Field(None, description="Selected time slot ID (e.g. 2026-09-10-slot-1)")
    time_slot_label: Optional[str] = Field(None, description="Human readable time slot label (e.g. 09:00 AM - 12:30 PM)")
    guest_count: int = Field(1, ge=1, le=100, description="Total number of travelers / guests")
    special_requests: Optional[str] = Field(None, max_length=1000, description="Dietary or accessibility notes")


class BookingResponse(BaseModel):
    id: str
    booking_code: str
    customer_id: str
    service_id: str
    service_title: str
    service_location: str
    service_image: str
    provider_name: str
    provider_phone: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    time_slot_id: Optional[str] = None
    time_slot_label: Optional[str] = None
    guest_count: int
    status: str  # PENDING, CONFIRMED, CANCELLED, COMPLETED
    payment_status: str = "PENDING"  # PAID, PENDING, FAILED
    unit_price: float
    total_amount: float
    special_requests: Optional[str] = None
    is_cancellable: bool = False
    refund_amount: Optional[float] = None
    refund_status: Optional[str] = None
    refund_code: Optional[str] = None
    can_review: bool = False
    has_reviewed: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BookingListResponse(BaseModel):
    bookings: List[BookingResponse]
    total: int


class ProviderBookingResponse(BaseModel):
    id: str
    booking_code: str
    service_id: str
    service_title: str
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    time_slot_label: Optional[str] = None
    guest_count: int
    status: str  # PENDING, CONFIRMED, COMPLETED, CANCELLED
    payment_status: str = "PENDING"  # PAID, PENDING, FAILED
    unit_price: float
    total_amount: float
    net_payout: float
    is_cancellable: bool = False
    refund_amount: Optional[float] = None
    refund_status: Optional[str] = None
    refund_code: Optional[str] = None
    special_requests: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProviderBookingListResponse(BaseModel):
    bookings: List[ProviderBookingResponse]
    total: int


class ProviderBookingStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Target status: CONFIRMED, CANCELLED, or COMPLETED")
