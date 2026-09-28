"""AI presentation schemas for Conversations and Agentic Trip Planner."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ── AI Conversations ──

class CreateAIConversationRequest(BaseModel):
    title: Optional[str] = "New Trip Planning"
    context_type: Optional[str] = "TRAVEL"


class SendAIMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, description="User conversational travel query or instruction")


class AIMessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    intent: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    recommended_services: Optional[List[Dict[str, Any]]] = None
    trip_planner_handoff: Optional[Dict[str, Any]] = None
    created_at: str


class AIConversationResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str
    context_type: str
    created_at: str
    updated_at: str


class AIConversationListResponse(BaseModel):
    items: List[AIConversationResponse] = []
    total: int = 0
    page: int = 1
    page_size: int = 20
    total_pages: int = 1


# ── Agentic Trip Planner ──

class GenerateTripPlanRequest(BaseModel):
    destination_district: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_days: Optional[int] = 2
    party_size: Optional[int] = 2
    max_budget: Optional[float] = None
    preferred_categories: Optional[List[str]] = []
    special_interests: Optional[List[str]] = []
    pace: Optional[str] = "MODERATE"
    notes: Optional[str] = None


class RefineTripPlanRequest(BaseModel):
    action: str = Field(..., description="REPLACE, REMOVE, REDUCE_BUDGET")
    day_number: Optional[int] = None
    item_id: Optional[str] = None
    replacement_service_id: Optional[str] = None
    target_budget: Optional[float] = None


class ConfirmTripPlanRequest(BaseModel):
    prompt_text: Optional[str] = "Plan trip with AI"


class TripPlanResponse(BaseModel):
    plan_id: str
    user_id: Optional[str] = None
    status: str
    constraints: Dict[str, Any]
    proposal: Optional[Dict[str, Any]] = None
    validation_report: Optional[Dict[str, Any]] = None
    clarification_questions: List[str] = []
    associated_trip_id: Optional[str] = None
    last_error: Optional[str] = None
