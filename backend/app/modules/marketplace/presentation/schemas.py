"""Marketplace presentation schemas."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, model_validator
from app.schemas.service import normalize_amenities


class CategoryResponse(BaseModel):
    id: str
    slug: str
    name: str
    marketplace_type: str
    icon: Optional[str] = None
    description: Optional[str] = None
    sort_order: int
    is_active: bool


class ServiceResponse(BaseModel):
    id: str
    title: str
    slug: str
    description: str
    category: str
    category_slug: str
    category_id: Optional[str] = None
    marketplace_type: str
    location: str
    district: str
    state: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    formatted_address: Optional[str] = None
    price: float
    unit: str
    duration_hours: Optional[float] = None
    max_capacity: Optional[int] = 10
    rating: float
    reviews_count: int
    is_verified: bool
    status: str
    provider_id: Optional[str] = None
    provider_name: str
    provider_type: str
    provider_avatar: Optional[str] = None
    primary_image: str
    images: List[str] = Field(default_factory=list)
    inclusions: List[str] = Field(default_factory=list)
    amenities: List[str] = Field(default_factory=list)
    specific_details: Optional[Dict[str, Any]] = Field(default_factory=dict)
    created_at: str

    @model_validator(mode="before")
    @classmethod
    def normalize_amenities_and_details(cls, data: Any) -> Any:
        if isinstance(data, dict):
            amenities_val = data.get("amenities")
            amenities_list, extra_details = normalize_amenities(amenities_val)
            data["amenities"] = amenities_list
            if extra_details:
                existing_details = data.get("specific_details") or {}
                if isinstance(existing_details, dict):
                    merged = dict(extra_details)
                    merged.update(existing_details)
                    data["specific_details"] = merged
                else:
                    data["specific_details"] = extra_details
        return data


class ServiceCreateRequest(BaseModel):
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    category_slug: str
    location: str
    district: str
    state: Optional[str] = "Karnataka"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    formatted_address: Optional[str] = None
    price: float = Field(..., gt=0)
    unit: Optional[str] = "night"
    duration_hours: Optional[float] = None
    max_capacity: Optional[int] = 10
    primary_image: str
    images: Optional[List[str]] = None
    inclusions: Optional[List[str]] = None
    amenities: Optional[List[str]] = None


class ServiceUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    district: Optional[str] = None
    price: Optional[float] = None
    unit: Optional[str] = None
    duration_hours: Optional[float] = None
    max_capacity: Optional[int] = None
    primary_image: Optional[str] = None
    images: Optional[List[str]] = None
    inclusions: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    status: Optional[str] = None


class ServiceAvailabilityResponse(BaseModel):
    id: str
    service_id: str
    date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    slot_label: Optional[str] = None
    capacity: int
    booked_count: int
    is_blocked: bool
    price_override: Optional[float] = None


class ServiceAvailabilityCreateRequest(BaseModel):
    date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    slot_label: Optional[str] = None
    capacity: Optional[int] = 10
    price_override: Optional[float] = None


class SavedServiceResponse(BaseModel):
    id: str
    service_id: str
    service: ServiceResponse
    created_at: str
