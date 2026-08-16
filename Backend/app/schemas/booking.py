from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime, date as DateType, time as TimeType
from decimal import Decimal

class BookingCreate(BaseModel):
    farm_id: int
    activity_id: Optional[int] = None
    booking_date: DateType
    check_out: Optional[DateType] = None
    start_time: Optional[TimeType] = None
    end_time: Optional[TimeType] = None
    guest_count: int = Field(1, ge=1)
    amount: Decimal = Field(..., ge=0)
    currency: str = "INR"
    special_request: Optional[str] = None
    contact_name: Optional[str] = None
    contact_mobile: Optional[str] = None
    contact_email: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def translate_legacy_keys(cls, data):
        if isinstance(data, dict):
            if "check_in" in data and "booking_date" not in data:
                data["booking_date"] = data["check_in"]
            if "total_price" in data and "amount" not in data:
                data["amount"] = data["total_price"]
            if "adults" in data and "guest_count" not in data:
                data["guest_count"] = data["adults"] + data.get("children", 0)
        return data

    @field_validator("check_out")
    @classmethod
    def validate_dates(cls, v, info):
        booking_date = info.data.get("booking_date")
        if booking_date and v and v <= booking_date:
            raise ValueError("check_out must be after booking_date")
        return v


class BookingOut(BaseModel):
    id: int
    user_id: int
    farm_id: int
    activity_id: Optional[int] = None
    booking_date: DateType
    check_out: Optional[DateType] = None
    start_time: Optional[TimeType] = None
    end_time: Optional[TimeType] = None
    guest_count: int
    amount: Decimal
    currency: str
    status: str
    payment_status: str
    special_request: Optional[str] = None
    contact_name: Optional[str] = None
    contact_mobile: Optional[str] = None
    contact_email: Optional[str] = None
    confirmation_code: Optional[str] = None
    cancelled_by: Optional[int] = None
    cancel_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Compatibility attributes
    booking_type: Optional[str] = "farm"
    check_in: Optional[DateType] = None
    total_price: Optional[Decimal] = None
    adults: Optional[int] = None
    children: Optional[int] = 0

    class Config:
        from_attributes = True


class BookingStatusUpdate(BaseModel):
    status: str

class DateChangeCreate(BaseModel):
    new_date: DateType
    message: Optional[str] = None

