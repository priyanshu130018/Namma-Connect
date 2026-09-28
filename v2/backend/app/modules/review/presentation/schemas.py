"""Review presentation schemas."""

from typing import Optional, List
from pydantic import BaseModel, Field


class ReviewCreateRequest(BaseModel):
    service_id: str
    booking_id: Optional[str] = None
    rating: int = Field(..., ge=1, le=5)
    cleanliness_rating: Optional[int] = Field(None, ge=1, le=5)
    hospitality_rating: Optional[int] = Field(None, ge=1, le=5)
    accuracy_rating: Optional[int] = Field(None, ge=1, le=5)
    value_rating: Optional[int] = Field(None, ge=1, le=5)
    comment: str = Field(..., min_length=5)
    photos: Optional[List[str]] = None


class ReviewResponse(BaseModel):
    id: str
    user_id: str
    service_id: str
    booking_id: Optional[str] = None
    rating: int
    cleanliness_rating: Optional[int] = None
    hospitality_rating: Optional[int] = None
    accuracy_rating: Optional[int] = None
    value_rating: Optional[int] = None
    comment: str
    photos: List[str] = Field(default_factory=list)
    status: str
    is_verified_booking: bool
    created_at: str


class ReviewStatsResponse(BaseModel):
    service_id: str
    average_rating: float
    total_reviews: int
