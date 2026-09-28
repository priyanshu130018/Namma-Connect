"""Provider presentation schemas."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class PartnerApplicationCreate(BaseModel):
    role_type: str = "farmer"
    full_name: str
    email: str
    mobile: str
    address: str
    district: str
    state: Optional[str] = "Karnataka"
    business_name: str
    experience_years: Optional[int] = 0
    bio: Optional[str] = None
    languages: Optional[str] = None
    id_type: str = "Aadhaar"
    id_number: str
    document_url: Optional[str] = None
    services: Optional[List[str]] = None
    activities: Optional[List[str]] = None


class PartnerApplicationResponse(BaseModel):
    id: str
    application_code: str
    user_id: str
    role_type: str
    full_name: str
    email: str
    mobile: str
    business_name: str
    district: str
    state: str
    status: str
    rejection_reason: Optional[str] = None
    created_at: str


class ProviderDashboardStats(BaseModel):
    total_services: int
    active_services: int
    total_bookings: int
    confirmed_bookings: int
    pending_bookings: int
    total_earnings: float
