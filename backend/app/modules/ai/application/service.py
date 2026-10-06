"""AI Application Service for Conversations and Agentic Trip Planner."""

import json
import uuid
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status

from app.modules.ai.infrastructure.repository import AIRepository
from app.modules.ai.presentation.schemas import (
    CreateAIConversationRequest,
    SendAIMessageRequest,
    GenerateTripPlanRequest,
    RefineTripPlanRequest,
    ConfirmTripPlanRequest,
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
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
        if conv.user_id and str(conv.user_id) != str(user.id) and getattr(user, "role", "") != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this conversation.")

        clean_content = payload.content.strip()

        # 1. Persist User Message
        user_msg = AIMessage(
            id=uuid.uuid4(),
            conversation_id=conv.id,
            role="USER",
            content=clean_content,
        )
        self.repo.save_message(user_msg)

        # 2. Fetch history for context
        history = self.repo.list_messages(conv_id=conv.id, limit=20)

        # 3. Process turn via Orchestrator
        result = self.orchestrator.process_turn(
            user=user,
            current_message=clean_content,
            history=history,
        )

        # 4. Persist Assistant Message
        meta = {
            "tool_calls": result.tool_calls_executed,
            "recommended_services": result.recommended_services,
            "trip_planner_handoff": result.trip_planner_handoff,
            "tokens_used": result.tokens_used,
        }
        ai_msg = AIMessage(
            id=uuid.uuid4(),
            conversation_id=conv.id,
            role="ASSISTANT",
            content=result.content,
            intent=result.intent,
            metadata_json=json.dumps(meta),
        )
        saved_ai_msg = self.repo.save_message(ai_msg)

        if conv.title == "New Trip Planning" and len(clean_content) > 3:
            conv.title = clean_content[:40] + ("..." if len(clean_content) > 40 else "")
            self.repo.save_conversation(conv)

        return self._serialize_message(saved_ai_msg)

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
            "role": m.role,
            "content": m.content,
            "intent": m.intent,
            "tool_calls": meta.get("tool_calls", []),
            "recommended_services": meta.get("recommended_services", []),
            "trip_planner_handoff": meta.get("trip_planner_handoff"),
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }
