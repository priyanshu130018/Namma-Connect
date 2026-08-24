"""Pydantic schemas for Marketplace Services, Search, Reviews, and Availability."""

from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class ReviewCreateRequest(BaseModel):
    booking_id: str = Field(..., description="Completed booking ID or code")
    rating: float = Field(..., ge=1.0, le=5.0, description="Rating score from 1.0 to 5.0")
    comment: str = Field(..., min_length=3, max_length=1000, description="Written customer review")


class ReviewResponse(BaseModel):
    id: str
    service_id: str
    booking_id: Optional[str] = None
    user_name: str
    rating: float
    comment: str
    is_verified: bool = True
    status: str = "PUBLISHED"
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ServiceResponse(BaseModel):
    id: str
    title: str
    slug: str
    description: str
    category: str
    category_slug: str
    location: str
    district: str
    state: str
    price: float
    unit: str
    duration_hours: Optional[float] = None
    max_capacity: Optional[int] = None
    rating: float
    reviews_count: int
    is_verified: bool
    status: str
    provider_name: str
    provider_type: str
    provider_avatar: Optional[str] = None
    primary_image: str
    images: List[str] = Field(default_factory=list)
    inclusions: List[str] = Field(default_factory=list)
    amenities: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ServiceListResponse(BaseModel):
    services: List[ServiceResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class ServiceDetailResponse(BaseModel):
    service: ServiceResponse
    reviews: List[ReviewResponse] = Field(default_factory=list)


class SearchSuggestionItem(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    text: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    slug: Optional[str] = None
    type: str = "service"  # service, category, location


class SearchSuggestionsResponse(BaseModel):
    query: str
    suggestions: List[SearchSuggestionItem]


class SearchResponse(BaseModel):
    query: str
    results: List[ServiceResponse]
    total: int
    page: int
    limit: int


# ── Availability Schemas ──

class TimeSlotItem(BaseModel):
    id: str
    start_time: str
    end_time: str
    is_available: bool
    capacity: int
    remaining_capacity: int


class DayAvailabilityItem(BaseModel):
    date: str  # YYYY-MM-DD
    is_available: bool
    status: str  # AVAILABLE, LIMITED, UNAVAILABLE, BLACKOUT
    price_override: Optional[float] = None
    remaining_capacity: Optional[int] = None
    time_slots: List[TimeSlotItem] = Field(default_factory=list)


class ServiceAvailabilityResponse(BaseModel):
    service_id: str
    service_title: str
    booking_model: str  # date_range, time_slot, single_date
    min_guests: int
    max_guests: int
    min_days_notice: int
    max_days_advance: int
    start_date: str
    end_date: str
    days: List[DayAvailabilityItem]
    blackout_dates: List[str] = Field(default_factory=list)


# ── Partner Service Management Payloads ──

class ServiceCreatePayload(BaseModel):
    title: str
    description: str
    category: str
    category_slug: Optional[str] = None
    location: str
    district: Optional[str] = None
    state: Optional[str] = "Karnataka"
    price: float
    unit: str = "night"
    duration_hours: Optional[float] = None
    max_capacity: Optional[int] = 10
    primary_image: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    inclusions: List[str] = Field(default_factory=list)
    amenities: List[str] = Field(default_factory=list)
    status: Optional[str] = "DRAFT"  # DRAFT, UNDER REVIEW, PUBLISHED
    specific_details: Optional[dict] = Field(default_factory=dict)


class ServiceUpdatePayload(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    category_slug: Optional[str] = None
    location: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    price: Optional[float] = None
    unit: Optional[str] = None
    duration_hours: Optional[float] = None
    max_capacity: Optional[int] = None
    primary_image: Optional[str] = None
    images: Optional[List[str]] = None
    inclusions: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    status: Optional[str] = None
    specific_details: Optional[dict] = None

