"""AI Application Service for Conversations and Agentic Trip Planner."""

import json
import uuid
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status

from app.modules.ai.infrastructure.repository import AIRepository
from app.modules.ai.agent.service import NammaAgentService
from app.modules.ai.presentation.schemas import (
    CreateAIConversationRequest,
    SendAIMessageRequest,
    GenerateTripPlanRequest,
    RefineTripPlanRequest,
    ConfirmTripPlanRequest,
    AgentRunRequest,
)
from app.modules.ai.domain.models import AIConversation, AIMessage
from app.modules.ai.llm.base import LLMProvider
from app.modules.ai.llm.gemini_provider import GeminiProvider
from app.modules.ai.tools.registry import AIToolRegistry
from app.modules.ai.assistant.orchestrator import AIAssistantOrchestrator
from app.modules.ai.trip_planner.orchestrator import AgenticTripPlanner
from app.modules.ai.trip_planner.state import PlannerState, TravelerConstraints
from app.modules.ai.trip_planner.handoff import BookingHandoffGenerator
from app.modules.user.domain.models import User


class AIService:
    """Orchestrates AI conversation management, tool execution, and Agentic Trip Planning."""

    # In-memory session cache for active multi-turn trip planning states
    _active_plans: Dict[str, PlannerState] = {}

    def __init__(
        self,
        repo: AIRepository,
        llm_provider: Optional[LLMProvider] = None,
        tool_registry: Optional[AIToolRegistry] = None,
    ):
        self.repo = repo
        self.db = repo.db
        self.llm_provider = llm_provider or GeminiProvider()
        self.tool_registry = tool_registry or AIToolRegistry(self.db)
        self.agent_service = NammaAgentService(self.db, self.repo)
        self.orchestrator = AIAssistantOrchestrator(
            db=self.db,
            llm_provider=self.llm_provider,
            tool_registry=self.tool_registry,
        )
        self.planner = AgenticTripPlanner(
            db=self.db,
            llm_provider=self.llm_provider,
        )

    # ── AI Conversations ──

    def create_conversation(self, user: User, payload: CreateAIConversationRequest) -> Dict[str, Any]:
        conv = self.repo.create_conversation(
            user_id=user.id,
            title=payload.title or "New Trip Planning",
            context_type=payload.context_type or "TRAVEL",
        )
        return self._serialize_conversation(conv)

    def list_conversations(
        self,
        user: User,
        context_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        offset = (page - 1) * page_size
        items, total = self.repo.list_user_conversations(
            user_id=user.id,
            context_type=context_type,
            limit=page_size,
            offset=offset,
        )
        return {
            "items": [self._serialize_conversation(c) for c in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1,
        }

    def get_conversation_messages(self, user: User, conv_id: str) -> List[Dict[str, Any]]:
        conv = self.repo.get_conversation(conv_id)
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
        if conv.user_id and str(conv.user_id) != str(user.id) and getattr(user, "role", "") != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this conversation.")

        messages = self.repo.list_messages(conv_id=conv.id)
        return [self._serialize_message(m) for m in messages]

    def send_message(self, user: User, conv_id: str, payload: SendAIMessageRequest) -> Dict[str, Any]:
        conv = self.repo.get_conversation(conv_id)
        if not conv:
            target_uuid = None
            if conv_id:
                try:
                    target_uuid = uuid.UUID(str(conv_id))
                except Exception:
                    pass
            conv = self.repo.create_conversation(
                user_id=user.id,
                title="New Trip Planning",
                context_type="TRAVEL",
                conversation_id=target_uuid,
            )
        elif conv.user_id and str(conv.user_id) != str(user.id) and getattr(user, "role", "") != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this conversation.")

        clean_content = payload.content.strip()

        # Route conversational message through the unified LangGraph agent
        agent_result = self.agent_service.run_agent(
            user=user,
            conversation_id=str(conv.id),
            message=clean_content,
        )

        return {
            "id": agent_result["id"],
            "conversation_id": agent_result["conversation_id"],
            "role": agent_result.get("role", "ASSISTANT"),
            "content": agent_result["content"],
            "intent": agent_result.get("intent", "AGENTIC_WORKFLOW"),
            "tool_calls": agent_result.get("tool_calls", []),
            "recommended_services": agent_result.get("recommended_services", []),
            "trip_planner_handoff": agent_result.get("trip_planner_handoff"),
            "trip_id": agent_result.get("trip_id"),
            "itinerary": agent_result.get("itinerary"),
            "budget": agent_result.get("budget"),
            "changed_items": agent_result.get("changed_items", []),
            "selected_services": agent_result.get("selected_services", []),
            "current_agent_step": agent_result.get("current_agent_step", "COMPLETED"),
            "approval_required": agent_result.get("approval_required", False),
            "approval_prompt": agent_result.get("approval_prompt"),
            "approval_status": agent_result.get("approval_status"),
            "booking_state": agent_result.get("booking_state"),
            "extracted_requirements": agent_result.get("extracted_requirements"),
            "created_at": agent_result.get("created_at", ""),
        }


    # ── Unified LangGraph Agent Endpoints ──

    def run_agent(self, user: User, payload: AgentRunRequest) -> Dict[str, Any]:
        """Execute unified LangGraph travel agent with full state return."""
        conv_id = payload.conversation_id or str(uuid.uuid4())
        return self.agent_service.run_agent(
            user=user,
            conversation_id=conv_id,
            message=payload.message,
        )

    def get_agent_state(self, user: User, conversation_id: str) -> Dict[str, Any]:
        """Retrieve persistent checkpoint state for a conversation thread."""
        conv = self.repo.get_conversation(conversation_id)
        if conv and conv.user_id and str(conv.user_id) != str(user.id) and getattr(user, "role", "") != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this conversation.")
        state = self.agent_service.get_agent_state(user=user, conversation_id=conversation_id)
        if not state:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent checkpoint state not found.")
        return state

    # ── Agentic Trip Planner ──

    def generate_trip_plan(self, user: User, payload: GenerateTripPlanRequest) -> Dict[str, Any]:
        constraints = TravelerConstraints(
            destination_district=payload.destination_district or "",
            start_date=payload.start_date,
            end_date=payload.end_date,
            duration_days=payload.duration_days or 2,
            party_size=payload.party_size or 2,
            max_budget=payload.max_budget,
            preferred_categories=payload.preferred_categories or [],
            special_interests=payload.special_interests or [],
            pace=payload.pace or "MODERATE",
            notes=payload.notes,
        )
        state = self.planner.plan_trip(
            user=user,
            constraints=constraints,
            prompt_text=payload.notes or f"Plan {payload.duration_days}-day trip to {payload.destination_district}",
        )
        self._active_plans[state.plan_id] = state
        return state.to_dict()

    def refine_trip_plan(self, user: User, plan_id: str, payload: RefineTripPlanRequest) -> Dict[str, Any]:
        state = self._active_plans.get(plan_id)
        if not state:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip planning session not found or expired.")
        if state.user_id and state.user_id != str(user.id) and getattr(user, "role", "") != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

        updated_state = self.planner.refine_itinerary(
            user=user,
            state=state,
            action=payload.action,
            day_number=payload.day_number,
            item_id=payload.item_id,
            replacement_service_id=payload.replacement_service_id,
            target_budget=payload.target_budget,
        )
        self._active_plans[plan_id] = updated_state
        return updated_state.to_dict()

    def confirm_trip_plan(self, user: User, plan_id: str, payload: ConfirmTripPlanRequest) -> Dict[str, Any]:
        state = self._active_plans.get(plan_id)
        if not state:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip planning session not found or expired.")
        if state.user_id and state.user_id != str(user.id) and getattr(user, "role", "") != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

        trip, handoff = self.planner.confirm_and_save_trip(
            user=user,
            state=state,
            prompt_text=payload.prompt_text or "Plan trip with AI",
        )
        self._active_plans[plan_id] = state
        return {
            "success": True,
            "trip_id": str(trip.id),
            "status": state.status.value,
            "booking_handoff": handoff,
        }

    def get_trip_plan(self, user: User, plan_id: str) -> Dict[str, Any]:
        state = self._active_plans.get(plan_id)
        if not state:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip planning session not found.")
        if state.user_id and state.user_id != str(user.id) and getattr(user, "role", "") != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")
        return state.to_dict()

    def get_booking_handoff(self, user: User, plan_id: str) -> Dict[str, Any]:
        state = self._active_plans.get(plan_id)
        if not state:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip planning session not found.")
        if state.user_id and state.user_id != str(user.id) and getattr(user, "role", "") != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")
        return BookingHandoffGenerator.generate_handoff_payload(state)

    def _serialize_conversation(self, c: AIConversation) -> Dict[str, Any]:
        return {
            "id": str(c.id),
            "user_id": str(c.user_id) if c.user_id else None,
            "title": c.title,
            "context_type": c.context_type,
            "created_at": c.created_at.isoformat() if c.created_at else "",
            "updated_at": c.updated_at.isoformat() if c.updated_at else "",
        }

    def _serialize_message(self, m: AIMessage) -> Dict[str, Any]:
        meta = {}
        if m.metadata_json:
            try:
                meta = json.loads(m.metadata_json)
            except Exception:
                meta = {}

        return {
            "id": str(m.id),
            "conversation_id": str(m.conversation_id),
            "role": m.role or "ASSISTANT",
            "content": m.content,
            "intent": m.intent,
            "tool_calls": meta.get("tool_calls", []),
            "recommended_services": meta.get("recommended_services", []),
            "trip_planner_handoff": meta.get("trip_planner_handoff"),
            "trip_id": meta.get("trip_id"),
            "itinerary": meta.get("itinerary"),
            "budget": meta.get("budget"),
            "changed_items": meta.get("changed_items", []),
            "selected_services": meta.get("selected_services", []),
            "current_agent_step": meta.get("agent_step", "COMPLETED"),
            "approval_required": meta.get("approval_required", False),
            "approval_prompt": meta.get("approval_prompt"),
            "approval_status": meta.get("approval_status"),
            "approval_action": meta.get("approval_action"),
            "booking_state": meta.get("booking_state"),
            "extracted_requirements": meta.get("extracted_requirements"),
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }

