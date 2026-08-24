"""Travel AI & Conversational Assistant Endpoints."""

import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.common import APIResponse
from app.services.gemini import GeminiService

router = APIRouter(prefix="/ai", tags=["Travel AI"])


class TravelChatRequest(BaseModel):
    conversation_id: Optional[str] = Field(None, description="Optional persistent conversation UUID")
    message: str = Field(..., min_length=1, description="User prompt or travel inquiry")
    destination: Optional[str] = Field(None, description="Target destination or region filter")
    category: Optional[str] = Field(None, description="Category filter (stay, experiences, food)")
    language: Optional[str] = Field("en", description="Preferred response language (en, kn)")


class TravelChatResponse(BaseModel):
    conversation_id: str
    reply: str
    suggested_services: List[Dict[str, Any]] = Field(default_factory=list)
    source: str = "grounded_catalog"


@router.post("/travel/chat", response_model=APIResponse[TravelChatResponse])
def travel_chat_assistant(
    payload: TravelChatRequest,
    db: Session = Depends(get_db),
):
    """Grounded Travel AI chatbot for Karnataka rural tourism & farm exploration."""
    conv_id = payload.conversation_id or f"conv-{uuid.uuid4()}"

    ai_result = GeminiService.generate_travel_plan(
        db=db,
        prompt=payload.message,
        conversation_id=conv_id,
        destination=payload.destination,
        category=payload.category,
        language=payload.language,
    )

    response_data = TravelChatResponse(
        conversation_id=conv_id,
        reply=ai_result.get("reply", "I can help you plan farm stays and agro-tours across Karnataka."),
        suggested_services=ai_result.get("recommended_services", []),
        source=ai_result.get("source", "grounded_catalog"),
    )

    return APIResponse(
        success=True,
        message="Travel AI response generated successfully.",
        data=response_data,
    )


@router.get("/travel/conversations", response_model=APIResponse[List[Dict[str, Any]]])
def get_travel_conversations():
    """Retrieve sample or active travel conversations."""
    return APIResponse(
        success=True,
        message="Conversations retrieved.",
        data=[],
    )
