"""Pydantic schemas for Trip Planning, Trip Days, Trip Items, and AI Trip Plans."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


# ── Trip Item Schemas ──

class TripItemBase(BaseModel):
    service_id: Optional[UUID] = None
    provider_id: Optional[UUID] = None
    booking_id: Optional[UUID] = None
    item_type: str = Field("SERVICE", description="SERVICE, ACTIVITY, STAY, FOOD, TRANSPORT, CUSTOM")
    title: str = Field(..., description="Item title")
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    sequence_order: int = Field(0, description="Order of item in the day schedule")
    notes: Optional[str] = None
    is_booked: bool = False


class TripItemCreate(TripItemBase):
    pass


class TripItemUpdate(BaseModel):
    service_id: Optional[UUID] = None
    item_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    sequence_order: Optional[int] = None
    notes: Optional[str] = None
    is_booked: Optional[bool] = None


class TripItemResponse(TripItemBase):
    id: UUID
    trip_day_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Trip Day Schemas ──

class TripDayBase(BaseModel):
    day_number: int = Field(..., description="Day index starting at 1")
    date: Optional[str] = Field(None, description="Date for this day (YYYY-MM-DD)")
    title: Optional[str] = Field(None, description="Day title (e.g. Day 1: Coorg Arrival & Plantation Walk)")
    notes: Optional[str] = None


class TripDayCreate(TripDayBase):
    items: Optional[List[TripItemCreate]] = Field(default_factory=list)


class TripDayResponse(TripDayBase):
    id: UUID
    trip_id: UUID
    items: List[TripItemResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Trip Schemas ──

class TripBase(BaseModel):
    title: str = Field(..., description="Trip title")
    description: Optional[str] = None
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    origin: Optional[str] = None
    destination: str = Field(..., description="Destination town, district, or region")
    status: str = Field("DRAFT", description="DRAFT, PLANNED, CONFIRMED, COMPLETED, CANCELLED")


class TripCreate(TripBase):
    days: Optional[List[TripDayCreate]] = Field(default_factory=list)


class TripUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    status: Optional[str] = None


class TripResponse(TripBase):
    id: UUID
    user_id: UUID
    created_by: str
    ai_generated: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TripDetailResponse(TripResponse):
    days: List[TripDayResponse] = Field(default_factory=list)


# ── AI Trip Generation Request/Response ──

class AITripGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=3, description="Trip planning prompt, e.g. 'Plan a 3-day coffee harvest trip in Coorg'")
    destination: Optional[str] = Field(None, description="Target destination (Coorg, Chikmagalur, Sakleshpur, etc.)")
    duration_days: Optional[int] = Field(2, ge=1, le=14, description="Number of days for the trip")
    start_date: Optional[str] = Field(None, description="Optional start date (YYYY-MM-DD)")
    budget_band: Optional[str] = Field("medium", description="budget band: budget, medium, luxury")
    interests: Optional[List[str]] = Field(default_factory=list, description="Categories / activities of interest")
    language: Optional[str] = Field("en", description="Preferred response language (en, kn, hi)")


class AITripPlanResponse(BaseModel):
    id: UUID
    trip_id: Optional[UUID] = None
    user_id: UUID
    prompt: str
    preferences_json: str
    constraints_json: str
    model: str
    model_version: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    trip: Optional[TripDetailResponse] = None

    model_config = ConfigDict(from_attributes=True)
