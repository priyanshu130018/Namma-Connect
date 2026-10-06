"""Pydantic schemas for Marketplace Categories."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class MarketplaceCategoryBase(BaseModel):
    marketplace_type: str = Field(..., description="Marketplace type (ACTIVITY, CONTENT_CREATOR, HOTEL_STAY, FOOD, TRANSPORT)")
    slug: str = Field(..., description="Unique URL-friendly slug")
    name: str = Field(..., description="Human-readable category name")
    icon: Optional[str] = Field(None, description="Icon identifier or emoji")
    description: Optional[str] = Field(None, description="Category description")
    sort_order: int = Field(0, description="Sort order display sequence")
    is_active: bool = Field(True, description="Whether category is active")


class MarketplaceCategoryCreate(MarketplaceCategoryBase):
    pass


class MarketplaceCategoryUpdate(BaseModel):
    marketplace_type: Optional[str] = None
    name: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class MarketplaceCategoryResponse(MarketplaceCategoryBase):
    id: UUID
    listing_count: int = Field(0, description="Number of active services in this category")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
