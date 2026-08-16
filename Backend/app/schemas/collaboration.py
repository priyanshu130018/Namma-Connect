from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date as DateType, time as TimeType
from decimal import Decimal

class CollaborationCreate(BaseModel):
    farmer_id: int
    creator_id: int
    farm_id: int
    initiated_by: str  # farmer, creator
    message: Optional[str] = None
    proposal: Optional[str] = None
    requested_date: Optional[DateType] = None
    start_time: Optional[TimeType] = None
    end_time: Optional[TimeType] = None
    amount: Optional[Decimal] = None

class CollaborationOut(BaseModel):
    id: int
    farmer_id: int
    creator_id: int
    farm_id: int
    initiated_by: str
    message: Optional[str] = None
    proposal: Optional[str] = None
    requested_date: Optional[DateType] = None
    start_time: Optional[TimeType] = None
    end_time: Optional[TimeType] = None
    amount: Optional[Decimal] = None
    currency: str
    status: str
    payment_status: str
    cancelled_by: Optional[int] = None
    cancel_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

from pydantic import field_validator

class CollaborationStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {
            "requested", "accepted", "rejected", "payment_pending",
            "paid", "active", "completed", "cancelled"
        }
        if v not in allowed:
            raise ValueError(f"Status must be one of {allowed}")
        return v
