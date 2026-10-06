"""Support presentation schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class CreateTicketRequest(BaseModel):
    subject: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    category: Optional[str] = "General"
    priority: Optional[str] = "MEDIUM"
    booking_id: Optional[str] = None
    service_id: Optional[str] = None


class UpdateTicketStatusRequest(BaseModel):
    status: str
    resolution_notes: Optional[str] = None


class SupportTicketResponse(BaseModel):
    id: str
    ticket_number: str
    user_id: str
    booking_id: Optional[str] = None
    service_id: Optional[str] = None
    category: str
    priority: str
    subject: str
    description: str
    status: str
    resolution_notes: Optional[str] = None
    resolved_at: Optional[str] = None
    created_at: str
    updated_at: str


class PublicContactRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=255)
    subject: str = Field(..., min_length=3, max_length=200)
    category: Optional[str] = Field("General Inquiry", max_length=50)
    message: str = Field(..., min_length=10, max_length=3000)


class PublicContactData(BaseModel):
    ticket_code: str
    name: str
    email: str
    category: str
    subject: str
    received_at: str


class PublicContactResponse(BaseModel):
    success: bool
    message: str
    data: PublicContactData


