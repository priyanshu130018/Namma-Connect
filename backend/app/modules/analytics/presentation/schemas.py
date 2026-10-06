"""Analytics presentation schemas."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class NCScoreResponse(BaseModel):
    provider_id: str
    score: float
    reputation_component: float
    engagement_component: float
    reliability_component: float
    snapshot_date: str


class ProviderDailyMetricsResponse(BaseModel):
    date: str
    views_count: int
    inquiries_count: int
    bookings_count: int
    revenue: float


class ProviderAnalyticsSummaryResponse(BaseModel):
    nc_score: Optional[NCScoreResponse] = None
    recent_metrics: List[ProviderDailyMetricsResponse] = []
    action_recommendations: List[Dict[str, Any]] = []
