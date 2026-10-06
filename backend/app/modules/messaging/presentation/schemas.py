"""Messaging presentation schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class SendMessageRequest(BaseModel):
    receiver_id: str
    content: str = Field(..., min_length=1)
    service_id: Optional[str] = None
    booking_id: Optional[str] = None
    media_url: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    receiver_id: str
    content: str
    message_type: str
    media_url: Optional[str] = None
    is_read: bool
    created_at: str


class ConversationResponse(BaseModel):
    id: str
    user1_id: str
    user2_id: str
    service_id: Optional[str] = None
    booking_id: Optional[str] = None
    last_message_at: Optional[str] = None
    created_at: str
