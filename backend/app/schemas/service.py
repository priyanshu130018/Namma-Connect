"""Pydantic schemas for Marketplace Services, Search, Reviews, and Availability."""

import json
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, ConfigDict, Field, model_validator
from datetime import datetime


def normalize_amenities(raw: Any) -> Tuple[List[str], Dict[str, Any]]:
    """Normalize raw amenities data into a list of strings and category-specific details dict.
    
    Requirements satisfied:
    - Supports existing list[str] amenities
    - Supports structured dict amenities
    - Preserves category-specific information in specific_details
    - Does not silently destroy stored data
    - Handles empty, null, and malformed inputs gracefully
    - Maintains backward compatibility with existing service records
    """
    if raw is None:
        return [], {}

    # If it's a JSON string, try to parse it
    if isinstance(raw, str):
        trimmed = raw.strip()
        if not trimmed:
            return [], {}
        try:
            parsed = json.loads(trimmed)
            return normalize_amenities(parsed)
        except Exception:
            # Plain string or comma-separated string: "Wi-Fi, Pool"
            if "," in trimmed:
                items = [item.strip() for item in trimmed.split(",") if item.strip()]
                return items, {}
            return [trimmed], {}

    if isinstance(raw, list):
        items = []
        for x in raw:
            if isinstance(x, str):
                s = x.strip()
                if s:
                    items.append(s)
            elif isinstance(x, dict):
                inner_items, _ = normalize_amenities(x)
                items.extend(inner_items)
            elif x is not None:
                items.append(str(x))
        return items, {}

    if isinstance(raw, dict):
        amenities_list = []
        specific_details = {}

        # 1. Check for explicit 'amenities' key
        if "amenities" in raw:
            inner_amenities = raw["amenities"]
            if isinstance(inner_amenities, list):
                for x in inner_amenities:
                    if isinstance(x, str):
                        s = x.strip()
                        if s:
                            amenities_list.append(s)
                    elif x is not None:
                        amenities_list.append(str(x))
            elif isinstance(inner_amenities, str) and inner_amenities.strip():
                if "," in inner_amenities:
                    amenities_list.extend([i.strip() for i in inner_amenities.split(",") if i.strip()])
                else:
                    amenities_list.append(inner_amenities.strip())
            elif isinstance(inner_amenities, dict):
                sub_items, sub_details = normalize_amenities(inner_amenities)
                amenities_list.extend(sub_items)
                specific_details.update(sub_details)

        # 2. Check for explicit 'specific_details' key
        if "specific_details" in raw and isinstance(raw["specific_details"], dict):
            specific_details.update(raw["specific_details"])

        # 3. Process remaining keys: preserve all category-specific info in specific_details,
        # and if any boolean flag is True, also include as an amenity name
        for k, v in raw.items():
            if k in ("amenities", "specific_details"):
                continue
            specific_details[k] = v
            if v is True and isinstance(v, bool):
                label = k.replace("_", " ").title()
                if label not in amenities_list and k not in amenities_list:
                    amenities_list.append(label)

        return amenities_list, specific_details

    # Fallback for any other type
    return [str(raw)], {}


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
    is_synthetic: bool = False
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
    category_id: Optional[str] = None
    marketplace_type: Optional[str] = "ACTIVITY"
    location: str
    district: str
    state: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    formatted_address: Optional[str] = None
    price: float
    unit: str
    duration_hours: Optional[float] = None
    max_capacity: Optional[int] = None
    rating: float
    reviews_count: int
    is_verified: bool
    is_synthetic: bool = False
    status: str
    provider_id: Optional[str] = None
    provider_name: str
    provider_type: str
    provider_avatar: Optional[str] = None
    provider_verified: Optional[bool] = None
    provider_email: Optional[str] = None
    provider_mobile: Optional[str] = None
    primary_image: str
    images: List[str] = Field(default_factory=list)
    inclusions: List[str] = Field(default_factory=list)
    amenities: List[str] = Field(default_factory=list)
    specific_details: Optional[Dict[str, Any]] = Field(default_factory=dict)
    rejection_reason: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

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
    category_id: Optional[str] = None
    marketplace_type: Optional[str] = "ACTIVITY"
    location: str
    district: Optional[str] = None
    state: Optional[str] = "Karnataka"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    formatted_address: Optional[str] = None
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
    category_id: Optional[str] = None
    marketplace_type: Optional[str] = None
    location: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    formatted_address: Optional[str] = None
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

