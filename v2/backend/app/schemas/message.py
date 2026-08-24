"""Pydantic schemas for Conversations and Messages."""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    content: str
    is_read: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: str
    participant_id: str
    participant_name: str
    subject: Optional[str] = None
    last_message_text: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationDetailResponse(BaseModel):
    conversation: ConversationResponse
    messages: List[MessageResponse]


class MessageSendRequest(BaseModel):
    conversation_id: Optional[str] = None
    recipient_id: Optional[str] = None
    content: str
    subject: Optional[str] = None
