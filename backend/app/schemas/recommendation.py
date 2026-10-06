"""Pydantic schemas for Recommendation Engine, Feedback, and User Interactions."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class UserInteractionCreate(BaseModel):
    service_id: Optional[UUID] = None
    provider_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    event_type: str = Field(..., description="VIEW, DETAIL_OPEN, CLICK, SAVE, UNSAVE, BOOK, SEARCH, SHARE, DISMISS, ADD_TO_TRIP")
    event_value: Optional[str] = None
    duration_seconds: Optional[int] = None
    session_id: Optional[str] = None
    source: Optional[str] = None
    metadata_json: Optional[str] = "{}"


class UserInteractionResponse(BaseModel):
    id: UUID
    user_id: UUID
    service_id: Optional[UUID] = None
    provider_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    event_type: str
    event_value: Optional[str] = None
    duration_seconds: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecommendationFeedbackCreate(BaseModel):
    recommendation_id: Optional[UUID] = None
    service_id: UUID
    feedback_type: str = Field(..., description="LIKE, DISLIKE, NOT_INTERESTED, HIDE, RELEVANT, IRRELEVANT")
    feedback_text: Optional[str] = None


class RecommendationFeedbackResponse(BaseModel):
    id: UUID
    user_id: UUID
    service_id: UUID
    recommendation_id: Optional[UUID] = None
    feedback_type: str
    feedback_text: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecommendationImpressionCreate(BaseModel):
    recommendation_id: Optional[UUID] = None
    service_id: UUID
    surface: str = "HOME"
    position: int = 0


class RecommendationImpressionResponse(BaseModel):
    id: UUID
    user_id: UUID
    service_id: UUID
    recommendation_id: Optional[UUID] = None
    surface: str
    position: int
    shown_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    saved_at: Optional[datetime] = None
    booked_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RecommendationResultResponse(BaseModel):
    id: UUID
    user_id: UUID
    service_id: UUID
    provider_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    recommendation_type: str
    section: str
    score: float
    rank: Optional[int] = None
    reason: Optional[str] = None
    reason_code: str
    explanation_text: str
    model_version: str
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
