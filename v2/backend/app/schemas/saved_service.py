"""Pydantic schemas for Customer Saved Services (Wishlist)."""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.service import ServiceResponse


class SavedServiceResponse(BaseModel):
    id: str
    service_id: str
    service: ServiceResponse
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SavedServiceStatusResponse(BaseModel):
    is_saved: bool
    service_id: str


class SavedServiceListResponse(BaseModel):
    services: List[ServiceResponse]
    total: int
