"""Recommendation presentation schemas."""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class RecordInteractionRequest(BaseModel):
    service_id: Optional[str] = None
    event_type: str = Field(..., description="VIEW, DETAIL_OPEN, CLICK, SAVE, BOOK, SEARCH, ADD_TO_TRIP, DISMISS")
    weight: Optional[float] = None
    duration_seconds: Optional[int] = None
    session_id: Optional[str] = None
    source: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class RecordImpressionRequest(BaseModel):
    service_id: str
    section: str = Field(..., description="e.g. recommended_for_you, top_rated, near_you")
    surface: Optional[str] = "HOME"
    position: Optional[int] = 0
    recommendation_id: Optional[str] = None


class RecommendationFeedbackRequest(BaseModel):
    service_id: str
    feedback_type: str = Field(..., description="LIKE, DISLIKE, NOT_INTERESTED, HIDE, RELEVANT, IRRELEVANT")
    feedback_text: Optional[str] = None
    recommendation_id: Optional[str] = None


class ServiceSummaryResponse(BaseModel):
    id: str
    title: str
    category: str
    category_slug: Optional[str] = None
    district: str
    price: float
    rating: float
    reviews_count: Optional[int] = 0
    primary_image: str


class RecommendationItemResponse(BaseModel):
    service_id: str
    score: float
    algorithm: str
    reason_code: Optional[str] = None
    explanation: Optional[str] = None
    service_details: Optional[ServiceSummaryResponse] = None


class HomeRecommendationsResponse(BaseModel):
    recommended_for_you: List[RecommendationItemResponse] = []
    top_rated: List[RecommendationItemResponse] = []
    most_visited: List[RecommendationItemResponse] = []
    near_you: List[RecommendationItemResponse] = []
    categories: List[Dict[str, Any]] = []


class UserInterestProfileResponse(BaseModel):
    user_id: str
    interest_score: float
    confidence_score: float
    interaction_count: int
    category_affinity: Dict[str, float] = {}
    destination_affinity: Dict[str, float] = {}
    topic_affinity: Dict[str, float] = {}
    budget_band: Dict[str, int] = {"min": 500, "max": 10000}
    last_updated: Optional[str] = None
