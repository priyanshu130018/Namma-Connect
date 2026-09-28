"""Pydantic schemas for AI Conversations, Messages, and Travel AI Assistant."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class AIMessageBase(BaseModel):
    role: str = Field(..., description="Message role (USER, ASSISTANT, SYSTEM)")
    content: str = Field(..., description="Message content text")
    intent: Optional[str] = Field(None, description="Classified intent (RECOMMENDATION, SERVICE_SEARCH, TRIP_PLANNING, BOOKING_HELP, GENERAL_TRAVEL)")
    metadata_json: Optional[str] = Field("{}", description="Serialized JSON metadata")


class AIMessageCreate(AIMessageBase):
    pass


class AIMessageResponse(AIMessageBase):
    id: UUID
    conversation_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AIConversationBase(BaseModel):
    title: str = Field("New Conversation", description="Conversation title")
    context_type: str = Field("TRAVEL", description="Conversation context type (TRAVEL, RECOMMENDATION, TRIP_PLANNING, GENERAL)")


class AIConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"
    context_type: Optional[str] = "TRAVEL"
    initial_message: Optional[str] = None


class AIConversationResponse(AIConversationBase):
    id: UUID
    user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AIConversationDetailResponse(AIConversationResponse):
    messages: List[AIMessageResponse] = Field(default_factory=list)


class TravelChatRequest(BaseModel):
    conversation_id: Optional[str] = Field(None, description="Optional persistent conversation UUID")
    message: str = Field(..., min_length=1, description="User prompt or travel inquiry")
    destination: Optional[str] = Field(None, description="Target destination or region filter")
    category: Optional[str] = Field(None, description="Category filter (stay, experiences, food)")
    language: Optional[str] = Field("en", description="Preferred response language (en, kn, hi)")


class TravelChatResponse(BaseModel):
    conversation_id: str
    reply: str
    suggested_services: List[Dict[str, Any]] = Field(default_factory=list)
    source: str = "grounded_catalog"
    intent: Optional[str] = None
