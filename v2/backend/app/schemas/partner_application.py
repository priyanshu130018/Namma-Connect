"""Schemas for Partner Application submission, review, and status."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class PartnerApplicationCreateRequest(BaseModel):
    role_type: str = Field(..., description="Partner role category: farmer, guide, travel, hotel, creator, artisan, homestay, event")
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    mobile: str = Field(..., min_length=10, max_length=32)
    address: str = Field(..., min_length=5, max_length=500)
    district: str = Field(..., min_length=2, max_length=100)
    state: str = Field("Karnataka", max_length=100)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    business_name: str = Field(..., min_length=2, max_length=255)
    experience_years: Optional[int] = Field(0, ge=0)
    bio: Optional[str] = None
    languages: Optional[str] = "Kannada, English"
    id_type: str = Field(..., description="Aadhaar, PAN, Land_RTC, Guide_License, Commercial_DL")
    id_number: str = Field(..., min_length=3, max_length=100)
    document_url: Optional[str] = None
    services: List[str] = Field(default_factory=list, description="List of dynamic custom/standard services")
    activities: List[str] = Field(default_factory=list, description="List of dynamic custom/standard activities")


class PartnerApplicationUpdateRequest(BaseModel):
    role_type: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    business_name: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    languages: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    document_url: Optional[str] = None
    services: Optional[List[str]] = None
    activities: Optional[List[str]] = None


class PartnerApplicationReviewRequest(BaseModel):
    approved: bool = Field(..., description="True to approve partner application, False to reject with reason")
    rejection_reason: Optional[str] = Field(None, description="Detailed explanation if changes are required")


class PartnerApplicationResponse(BaseModel):
    id: str
    application_code: str
    user_id: str
    role_type: str
    full_name: str
    email: str
    mobile: str
    address: str
    district: str
    state: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    business_name: str
    experience_years: int
    bio: Optional[str] = None
    languages: Optional[str] = None
    id_type: str
    id_number: str
    document_url: Optional[str] = None
    services: List[str]
    activities: List[str]
    status: str
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
