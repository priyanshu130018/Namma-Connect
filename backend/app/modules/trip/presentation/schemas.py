"""Trip presentation schemas."""

from typing import Optional, List
from datetime import date
from pydantic import BaseModel, Field


class TripCreateRequest(BaseModel):
    title: str = Field(..., min_length=3)
    start_date: date
    end_date: date
    destination_district: Optional[str] = None
    destination_state: Optional[str] = "Karnataka"
    budget_limit: Optional[float] = None
    notes: Optional[str] = None


class TripItemCreateRequest(BaseModel):
    trip_day_id: Optional[str] = None
    service_id: Optional[str] = None
    booking_id: Optional[str] = None
    title: str = Field(..., min_length=2)
    category: Optional[str] = "Activity"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    estimated_cost: Optional[float] = None
    sort_order: Optional[int] = 0
    notes: Optional[str] = None


class TripItemResponse(BaseModel):
    id: str
    trip_day_id: Optional[str] = None
    trip_id: str
    service_id: Optional[str] = None
    booking_id: Optional[str] = None
    title: str
    category: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    estimated_cost: Optional[float] = None
    currency: str
    sort_order: int
    notes: Optional[str] = None


class TripDayResponse(BaseModel):
    id: str
    trip_id: str
    day_number: int
    date: str
    title: Optional[str] = None
    notes: Optional[str] = None
    items: List[TripItemResponse] = Field(default_factory=list)


class TripResponse(BaseModel):
    id: str
    user_id: str
    title: str
    start_date: str
    end_date: str
    destination_district: Optional[str] = None
    destination_state: str
    budget_limit: Optional[float] = None
    currency: str
    status: str
    notes: Optional[str] = None
    days: List[TripDayResponse] = Field(default_factory=list)
    created_at: str
    updated_at: str
