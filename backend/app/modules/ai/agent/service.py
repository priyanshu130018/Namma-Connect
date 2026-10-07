"""Agent service orchestrating execution, thread checkpointing, and conversation history."""

import json
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.modules.user.domain.models import User
from app.modules.ai.domain.models import AIConversation, AIMessage
from app.modules.ai.infrastructure.repository import AIRepository
from app.modules.ai.agent.state import AgentState
from app.modules.ai.agent.persistence import SQLAlchemyCheckpointSaver
from app.modules.ai.agent.graph import create_agent_graph


class NammaAgentService:
    """Unified service interface for running and managing LangGraph Namma AI agent runs."""

    def __init__(self, db: Session, ai_repo: Optional[AIRepository] = None):
        self.db = db
        self.ai_repo = ai_repo or AIRepository(db)
        self.checkpointer = SQLAlchemyCheckpointSaver(db)

    def run_agent(
        self,
        user: User,
        conversation_id: str,
        message: str,
    ) -> Dict[str, Any]:
        """Run the unified LangGraph travel agent for a conversational turn."""
        clean_prompt = message.strip()

        # 1. Ensure conversation exists in DB
        conv = self.ai_repo.get_conversation(conversation_id)
        if not conv:
            target_uuid = None
            if conversation_id:
                try:
                    target_uuid = uuid.UUID(str(conversation_id))
                except Exception:
                    pass
            conv = self.ai_repo.create_conversation(
                user_id=user.id,
                title=clean_prompt[:40] + ("..." if len(clean_prompt) > 40 else ""),
                context_type="TRAVEL",
                conversation_id=target_uuid,
            )
            conversation_id = str(conv.id)

        # 2. Persist User Message
        user_msg = AIMessage(
            id=uuid.uuid4(),
            conversation_id=conv.id,
            role="USER",
            content=clean_prompt,
        )
        self.ai_repo.save_message(user_msg)

        # 3. Compile agent graph with persistent checkpointer
        agent_app = create_agent_graph(
            db=self.db,
            user=user,
            checkpointer=self.checkpointer,
        )

        config = {
            "configurable": {
                "thread_id": str(conversation_id),
            },
            "max_concurrency": 1,
        }

        # 4. Bootstrap active trip context from recent conversation history if not in initial input
        active_trip_id = None
        active_itinerary = None
        active_budget = None
        if conv:
            recent_msgs = self.ai_repo.list_messages(conv_id=conv.id, limit=20)
            for m in reversed(recent_msgs):
                if m.role == "ASSISTANT" and m.metadata_json:
                    try:
                        meta = json.loads(m.metadata_json)
                        if not active_trip_id and meta.get("trip_id"):
                            active_trip_id = meta.get("trip_id")
                        if not active_itinerary and meta.get("itinerary"):
                            active_itinerary = meta.get("itinerary")
                        if not active_budget and meta.get("budget"):
                            active_budget = meta.get("budget")
                    except Exception:
                        pass

        # 5. Invoke LangGraph agent
        input_state: AgentState = {
            "user_id": str(user.id),
            "conversation_id": str(conversation_id),
            "current_user_request": clean_prompt,
            "messages": [],
            "execution_trace": [],
        }
        if active_trip_id:
            input_state["trip_id"] = active_trip_id
        if active_itinerary:
            input_state["itinerary"] = active_itinerary
        if active_budget:
            input_state["budget"] = active_budget

        final_state: AgentState = agent_app.invoke(input_state, config)

        response_content = final_state.get(
            "response_content",
            "I've updated your travel plans based on your request.",
        )

        # Determine intent for auditability and schema compatibility
        reqs = final_state.get("extracted_requirements") or {}
        if final_state.get("booking_state"):
            resolved_intent = "BOOKING"
        elif final_state.get("itinerary"):
            resolved_intent = "TRIP_PLANNER_HANDOFF"
        elif final_state.get("search_results"):
            resolved_intent = "MARKETPLACE_SEARCH"
        elif reqs.get("destination_district"):
            resolved_intent = "MARKETPLACE_SEARCH"
        else:
            try:
                from app.modules.ai.assistant.intent_router import IntentRouter
                resolved_intent = IntentRouter.classify_intent(clean_prompt).intent
            except Exception:
                resolved_intent = "AGENTIC_WORKFLOW"

        # 5. Persist Assistant Message with rich metadata
        trace = final_state.get("execution_trace", [])
        tool_calls = [
            {"name": t.get("action", t.get("step")), "args": t}
            for t in trace
            if "action" in t or "step" in t
        ]
        trip_handoff = None
        if final_state.get("trip_id"):
            trip_handoff = {
                "trip_id": final_state.get("trip_id"),
                "itinerary": final_state.get("itinerary"),
            }

        meta = {
            "agent_step": final_state.get("current_agent_step", "COMPLETED"),
            "extracted_requirements": reqs,
            "trip_id": final_state.get("trip_id"),
            "itinerary": final_state.get("itinerary"),
            "budget": final_state.get("budget"),
            "search_results": final_state.get("search_results", []),
            "selected_services": final_state.get("selected_services", []),
            "availability_results": final_state.get("availability_results", []),
            "booking_state": final_state.get("booking_state"),
            "approval_required": final_state.get("approval_required", False),
            "approval_status": final_state.get("approval_status"),
            "approval_prompt": final_state.get("approval_prompt"),
            "approval_action": final_state.get("approval_action"),
            "payment_status": final_state.get("payment_status"),
            "changed_items": final_state.get("changed_items", []),
            "execution_trace": trace,
            "tool_calls": tool_calls,
            "recommended_services": final_state.get("search_results", []),
            "trip_planner_handoff": trip_handoff,
            "errors": final_state.get("errors", []),
        }

        ai_msg = AIMessage(
            id=uuid.uuid4(),
            conversation_id=conv.id,
            role="ASSISTANT",
            content=response_content,
            intent=resolved_intent,
            metadata_json=json.dumps(meta),
        )
        saved_ai_msg = self.ai_repo.save_message(ai_msg)

        # Update conversation title if default
        if conv.title == "New Conversation" or conv.title == "New Trip Planning":
            conv.title = clean_prompt[:40] + ("..." if len(clean_prompt) > 40 else "")
            self.ai_repo.save_conversation(conv)

        try:
            with SQLAlchemyCheckpointSaver._lock:
                self.db.commit()
        except Exception:
            pass

        return {
            "id": str(saved_ai_msg.id),
            "message_id": str(saved_ai_msg.id),
            "conversation_id": str(conv.id),
            "role": "ASSISTANT",
            "content": response_content,
            "intent": resolved_intent,
            "extracted_requirements": reqs,
            "current_agent_step": final_state.get("current_agent_step", "COMPLETED"),
            "trip_id": final_state.get("trip_id"),
            "itinerary": final_state.get("itinerary"),
            "budget": final_state.get("budget"),
            "search_results": final_state.get("search_results", []),
            "selected_services": final_state.get("selected_services", []),
            "availability_results": final_state.get("availability_results", []),
            "booking_state": final_state.get("booking_state"),
            "approval_required": final_state.get("approval_required", False),
            "approval_status": final_state.get("approval_status"),
            "approval_prompt": final_state.get("approval_prompt"),
            "approval_action": final_state.get("approval_action"),
            "payment_status": final_state.get("payment_status"),
            "changed_items": final_state.get("changed_items", []),
            "execution_trace": trace,
            "tool_calls": tool_calls,
            "recommended_services": final_state.get("search_results", []),
            "trip_planner_handoff": trip_handoff,
            "errors": final_state.get("errors", []),
            "created_at": saved_ai_msg.created_at.isoformat() if saved_ai_msg.created_at else "",
        }


    def get_agent_state(self, user: User, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve persisted agent checkpoint state for a thread, with fallback to message metadata and DB trip records."""
        config = {
            "configurable": {
                "thread_id": str(conversation_id),
            }
        }
        cp_tuple = self.checkpointer.get_tuple(config)
        channel_values: Dict[str, Any] = {}
        checkpoint_id = None
        if cp_tuple and cp_tuple.checkpoint:
            channel_values = dict(cp_tuple.checkpoint.get("channel_values", {}))
            checkpoint_id = cp_tuple.checkpoint.get("id")

        # Fallback to latest message metadata if checkpoint lacks itinerary or trip_id
        if not channel_values.get("itinerary") or not channel_values.get("trip_id"):
            conv = self.ai_repo.get_conversation(conversation_id)
            if conv:
                messages = self.ai_repo.list_messages(conv_id=conv.id, limit=50)
                for msg in reversed(messages):
                    if msg.role == "ASSISTANT" and msg.metadata_json:
                        try:
                            meta = json.loads(msg.metadata_json)
                            if not channel_values.get("trip_id") and meta.get("trip_id"):
                                channel_values["trip_id"] = meta.get("trip_id")
                            if not channel_values.get("itinerary") and meta.get("itinerary"):
                                channel_values["itinerary"] = meta.get("itinerary")
                            if not channel_values.get("budget") and meta.get("budget"):
                                channel_values["budget"] = meta.get("budget")
                            if not channel_values.get("booking_state") and meta.get("booking_state"):
                                channel_values["booking_state"] = meta.get("booking_state")
                            if not channel_values.get("search_results") and meta.get("search_results"):
                                channel_values["search_results"] = meta.get("search_results")
                            if not channel_values.get("selected_services") and meta.get("selected_services"):
                                channel_values["selected_services"] = meta.get("selected_services")
                            if not channel_values.get("approval_required") and meta.get("approval_required"):
                                channel_values["approval_required"] = meta.get("approval_required")
                                channel_values["approval_prompt"] = meta.get("approval_prompt")
                                channel_values["approval_status"] = meta.get("approval_status")
                                channel_values["approval_action"] = meta.get("approval_action")
                            if not channel_values.get("current_agent_step") and meta.get("agent_step"):
                                channel_values["current_agent_step"] = meta.get("agent_step")
                            if channel_values.get("itinerary") and channel_values.get("trip_id"):
                                break
                        except Exception:
                            pass

        # If trip_id exists but itinerary is not yet formatted, load from authoritative DB Trip model
        trip_id = channel_values.get("trip_id")
        if trip_id and (not channel_values.get("itinerary") or not channel_values["itinerary"].get("days")):
            try:
                from app.modules.trip.infrastructure.persistence import TripPersistenceEngine
                plan_state = TripPersistenceEngine.load_trip_as_plan_state(self.db, trip_id)
                if plan_state and plan_state.proposal:
                    channel_values["itinerary"] = plan_state.proposal.to_dict()
            except Exception:
                pass

        if not channel_values and not checkpoint_id:
            conv = self.ai_repo.get_conversation(conversation_id)
            if not conv:
                return None

        return {
            "conversation_id": str(conversation_id),
            "checkpoint_id": checkpoint_id,
            "current_agent_step": channel_values.get("current_agent_step", "IDLE"),
            "trip_id": channel_values.get("trip_id"),
            "itinerary": channel_values.get("itinerary"),
            "budget": channel_values.get("budget"),
            "search_results": channel_values.get("search_results", []),
            "selected_services": channel_values.get("selected_services", []),
            "availability_results": channel_values.get("availability_results", []),
            "booking_state": channel_values.get("booking_state"),
            "approval_required": channel_values.get("approval_required", False),
            "approval_status": channel_values.get("approval_status"),
            "approval_prompt": channel_values.get("approval_prompt"),
            "approval_action": channel_values.get("approval_action"),
            "payment_status": channel_values.get("payment_status"),
            "changed_items": channel_values.get("changed_items", []),
            "execution_trace": channel_values.get("execution_trace", []),
            "errors": channel_values.get("errors", []),
        }
