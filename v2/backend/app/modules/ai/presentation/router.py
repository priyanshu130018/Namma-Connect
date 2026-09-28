"""AI Presentation Router (V2 REST API for Conversations and Agentic Trip Planner)."""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.modules.user.domain.models import User
from app.modules.ai.infrastructure.repository import AIRepository
from app.modules.ai.application.service import AIService
from app.modules.ai.presentation.schemas import (
    CreateAIConversationRequest,
    SendAIMessageRequest,
    AIConversationResponse,
    AIConversationListResponse,
    AIMessageResponse,
    GenerateTripPlanRequest,
    RefineTripPlanRequest,
    ConfirmTripPlanRequest,
    TripPlanResponse,
)

router = APIRouter(prefix="/ai", tags=["AI"])


def get_ai_service(db: Session = Depends(get_db)) -> AIService:
    repo = AIRepository(db)
    return AIService(repo)


# ── AI Conversations Endpoints ──

@router.post("/conversations", response_model=AIConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: CreateAIConversationRequest,
    current_user: User = Depends(get_current_active_user),
    service: AIService = Depends(get_ai_service),
):
    """Start a new AI Assistant conversation session."""
    return service.create_conversation(user=current_user, payload=payload)


@router.get("/conversations", response_model=AIConversationListResponse)
def list_conversations(
    context_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    service: AIService = Depends(get_ai_service),
):
    """List AI conversation sessions for the authenticated customer."""
    return service.list_conversations(
        user=current_user,
        context_type=context_type,
        page=page,
        page_size=page_size,
    )


@router.get("/conversations/{conversation_id}/messages", response_model=List[AIMessageResponse])
def get_conversation_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user),
    service: AIService = Depends(get_ai_service),
):
    """Retrieve message history for an AI conversation."""
    return service.get_conversation_messages(user=current_user, conv_id=conversation_id)


@router.post("/conversations/{conversation_id}/messages", response_model=AIMessageResponse, status_code=status.HTTP_201_CREATED)
def send_message_to_ai(
    conversation_id: str,
    payload: SendAIMessageRequest,
    current_user: User = Depends(get_current_active_user),
    service: AIService = Depends(get_ai_service),
):
    """Send a message to the AI Assistant and receive grounded recommendations."""
    return service.send_message(user=current_user, conv_id=conversation_id, payload=payload)


# ── Agentic Trip Planner Endpoints ──

@router.post("/trip-plans/generate", response_model=TripPlanResponse, status_code=status.HTTP_200_OK)
def generate_trip_plan(
    payload: GenerateTripPlanRequest,
    current_user: User = Depends(get_current_active_user),
    service: AIService = Depends(get_ai_service),
):
    """Generate or evaluate multi-day trip requirements using agentic planning loop."""
    return service.generate_trip_plan(user=current_user, payload=payload)


@router.post("/trip-plans/{plan_id}/refine", response_model=TripPlanResponse, status_code=status.HTTP_200_OK)
def refine_trip_plan(
    plan_id: str,
    payload: RefineTripPlanRequest,
    current_user: User = Depends(get_current_active_user),
    service: AIService = Depends(get_ai_service),
):
    """Refine a draft itinerary (replace activity, remove activity, reduce budget)."""
    return service.refine_trip_plan(user=current_user, plan_id=plan_id, payload=payload)


@router.post("/trip-plans/{plan_id}/confirm", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def confirm_trip_plan(
    plan_id: str,
    payload: ConfirmTripPlanRequest,
    current_user: User = Depends(get_current_active_user),
    service: AIService = Depends(get_ai_service),
):
    """Confirm itinerary, persist to Trip/TripDay/TripItem tables, and generate booking handoff."""
    return service.confirm_trip_plan(user=current_user, plan_id=plan_id, payload=payload)


@router.get("/trip-plans/{plan_id}", response_model=TripPlanResponse)
def get_trip_plan(
    plan_id: str,
    current_user: User = Depends(get_current_active_user),
    service: AIService = Depends(get_ai_service),
):
    """Retrieve the current state of an active trip planning session."""
    return service.get_trip_plan(user=current_user, plan_id=plan_id)


@router.get("/trip-plans/{plan_id}/booking-handoff", response_model=Dict[str, Any])
def get_booking_handoff(
    plan_id: str,
    current_user: User = Depends(get_current_active_user),
    service: AIService = Depends(get_ai_service),
):
    """Retrieve pre-booking checkout handoff payload without creating premature bookings or payments."""
    return service.get_booking_handoff(user=current_user, plan_id=plan_id)
