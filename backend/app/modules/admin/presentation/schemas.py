"""Admin presentation schemas."""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class PlatformSettingRequest(BaseModel):
    key: str = Field(..., min_length=2)
    value_json: str
    description: Optional[str] = None


class PlatformSettingResponse(BaseModel):
    id: str
    key: str
    value_json: str
    description: Optional[str] = None
    created_at: str
    updated_at: str


class PlatformOverviewStatsResponse(BaseModel):
    total_users: int
    total_partners: int
    total_services: int
    total_bookings: int
    total_gmv: float
