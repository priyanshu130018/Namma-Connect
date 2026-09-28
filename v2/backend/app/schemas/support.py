"""Pydantic schemas for Customer Support Tickets."""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class TicketReplyItem(BaseModel):
    sender_name: str
    sender_role: str  # "customer", "admin", "agent"
    message: str
    created_at: Optional[str] = None


class SupportTicketCreateRequest(BaseModel):
    category: str = Field(..., description="Booking, Payment, Cancellation, Refund, Account, Service, Other")
    subject: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    booking_id: Optional[str] = Field(None, description="Optional booking reference ID")


class SupportTicketReplyRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)


class SupportTicketResponse(BaseModel):
    id: str
    ticket_code: str
    user_id: str
    user_name: str
    user_email: str
    booking_id: Optional[str] = None
    category: str
    subject: str
    description: str
    status: str  # OPEN, IN_PROGRESS, RESOLVED, CLOSED
    priority: str  # LOW, MEDIUM, HIGH, URGENT
    responses: List[TicketReplyItem] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PublicContactRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name of sender")
    email: str = Field(..., min_length=5, max_length=255, description="Email address for replies")
    subject: str = Field(..., min_length=3, max_length=255, description="Inquiry subject")
    category: str = Field("General Inquiry", description="Category of inquiry")
    message: str = Field(..., min_length=10, max_length=5000, description="Detailed message content")


class PublicContactResponse(BaseModel):
    ticket_code: str
    name: str
    email: str
    subject: str
    category: str
    message: str
    created_at: Optional[datetime] = None


class SupportTicketListResponse(BaseModel):
    tickets: List[SupportTicketResponse]
    total: int
