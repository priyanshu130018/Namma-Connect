"""Pydantic schemas for Admin Operations, User Moderation, and System Audit."""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class AdminOverviewResponse(BaseModel):
    total_users: int = Field(0, description="Total registered platform users")
    total_partners: int = Field(0, description="Total partner/farmer host accounts")
    pending_verifications: int = Field(0, description="Hosts awaiting KYC document verification")
    published_services: int = Field(0, description="Active marketplace listings")
    total_bookings: int = Field(0, description="Total lifetime bookings")
    total_revenue: float = Field(0.0, description="Gross booking volume in INR")
    pending_payouts: int = Field(0, description="Payouts currently processing")
    open_support_tickets: int = Field(0, description="Unresolved customer support tickets")


class AdminUserItemResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminPartnerVerificationRequest(BaseModel):
    action: str = Field(..., description="APPROVE, REJECT, or REQUEST_CHANGES")
    notes: Optional[str] = Field(None, description="Admin moderation comments")


class AdminServiceStatusRequest(BaseModel):
    status: str = Field(..., description="PUBLISHED, DRAFT, ARCHIVED, or REJECTED")


class AdminPayoutStatusRequest(BaseModel):
    status: str = Field(..., description="COMPLETED, FAILED, or PROCESSING")
    failure_reason: Optional[str] = None


class AdminSupportTicketItem(BaseModel):
    id: str
    user_email: str
    user_name: str
    subject: str
    category: str
    status: str  # OPEN, IN_PROGRESS, RESOLVED, CLOSED
    priority: str  # LOW, MEDIUM, HIGH, URGENT
    created_at: Optional[datetime] = None


class AdminPlatformSettingsResponse(BaseModel):
    platform_name: str = "NammaConnect"
    commission_rate: float = 0.05
    currency: str = "INR"
    environment: str = "production"
    is_maintenance_mode: bool = False
    support_email: str = "support@nammaconnect.in"
