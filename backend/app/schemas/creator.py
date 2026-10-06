"""Pydantic schemas for Creators and Collaborations."""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PortfolioItemSchema(BaseModel):
    title: str
    location: str
    imageUrl: str
    description: Optional[str] = None
    category: Optional[str] = "Photography"


class CreatorPackageSchema(BaseModel):
    id: Optional[str] = None
    title: str
    price: float
    deliverables: List[str] = Field(default_factory=list)
    turnaround: str
    description: Optional[str] = None


class CreatorProfileResponse(BaseModel):
    id: str
    user_id: str
    display_name: str
    handle: str
    avatar_url: Optional[str] = None
    bio: str
    location: str
    reach: str
    starting_rate: float
    rating: float
    reviews_count: int
    is_verified: bool
    specialties: List[str] = Field(default_factory=list)
    social_links: Dict[str, str] = Field(default_factory=dict)
    portfolio_items: List[PortfolioItemSchema] = Field(default_factory=list)
    packages: List[CreatorPackageSchema] = Field(default_factory=list)
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CreatorProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    reach: Optional[str] = None
    starting_rate: Optional[float] = None
    specialties: Optional[List[str]] = None
    social_links: Optional[Dict[str, str]] = None


class CollaborationCreateRequest(BaseModel):
    creator_id: str
    campaign_title: str
    message: str
    proposed_dates: str
    budget: float
    deliverables: List[str] = Field(default_factory=list)


class CollaborationResponse(BaseModel):
    id: str
    collaboration_code: str
    creator_id: str
    creator_name: str
    creator_handle: str
    partner_id: str
    partner_name: str
    campaign_title: str
    message: str
    proposed_dates: str
    budget: float
    deliverables: List[str] = Field(default_factory=list)
    status: str  # PENDING, ACCEPTED, REJECTED, COMPLETED
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CollaborationStatusUpdateRequest(BaseModel):
    status: str  # ACCEPTED, REJECTED, COMPLETED
