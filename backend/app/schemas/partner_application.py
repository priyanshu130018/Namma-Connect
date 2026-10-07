from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class ServiceItemPayload(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = "Service offering details."
    category: str = Field(..., max_length=100)
    price: float = Field(..., ge=0)
    unit: str = Field("person", max_length=50)
    max_capacity: Optional[int] = Field(10, ge=1)
    duration_hours: Optional[float] = Field(2.0, ge=0.5)
    images: List[str] = Field(default_factory=list)


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
    provider_details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Role-specific provider metadata")
    documents: List[Dict[str, Any]] = Field(default_factory=list, description="Verification documents list")
    images: List[str] = Field(default_factory=list, description="Business/Location images list")
    services: List[str] = Field(default_factory=list, description="List of service titles")
    activities: List[str] = Field(default_factory=list, description="List of activity titles")
    services_payload: List[ServiceItemPayload] = Field(default_factory=list, description="Full service objects created during onboarding")
    draft_step: Optional[int] = 5


class PartnerApplicationDraftRequest(BaseModel):
    role_type: str = Field("farmer")
    full_name: Optional[str] = ""
    email: Optional[str] = ""
    mobile: Optional[str] = ""
    address: Optional[str] = ""
    district: Optional[str] = ""
    state: Optional[str] = "Karnataka"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    business_name: Optional[str] = ""
    experience_years: Optional[int] = 0
    bio: Optional[str] = ""
    languages: Optional[str] = "Kannada, English"
    id_type: Optional[str] = "Aadhaar"
    id_number: Optional[str] = ""
    document_url: Optional[str] = None
    provider_details: Optional[Dict[str, Any]] = Field(default_factory=dict)
    documents: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    images: Optional[List[str]] = Field(default_factory=list)
    services: Optional[List[str]] = Field(default_factory=list)
    activities: Optional[List[str]] = Field(default_factory=list)
    services_payload: Optional[List[ServiceItemPayload]] = Field(default_factory=list)
    draft_step: Optional[int] = 1


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
    provider_details: Optional[Dict[str, Any]] = None
    documents: Optional[List[Dict[str, Any]]] = None
    images: Optional[List[str]] = None
    services: Optional[List[str]] = None
    activities: Optional[List[str]] = None
    services_payload: Optional[List[ServiceItemPayload]] = None
    draft_step: Optional[int] = None


class PartnerApplicationReviewRequest(BaseModel):
    approved: bool = Field(..., description="True to approve partner application, False to reject with reason")
    rejection_reason: Optional[str] = Field(None, description="Detailed explanation if changes are required")
    approve_services_together: Optional[bool] = Field(True, description="Whether to approve attached onboarding services together")


class PartnerApplicationRejectRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=3, description="Detailed explanation why the application is rejected")


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
    provider_details: Dict[str, Any] = Field(default_factory=dict)
    documents: List[Dict[str, Any]] = Field(default_factory=list)
    images: List[str] = Field(default_factory=list)
    services: List[str]
    activities: List[str]
    draft_step: int = 1
    is_synthetic: bool = False
    status: str
    rejection_reason: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
