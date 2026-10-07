"""LangGraph workflow definition for Namma Connect Agent."""

from typing import Any, Dict, Optional
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.base import BaseCheckpointSaver
from sqlalchemy.orm import Session

from app.modules.user.domain.models import User
from app.modules.ai.agent.state import AgentState
from app.modules.ai.agent.nodes import (
    understand_request_node,
    load_user_context_node,
    decide_actions_node,
    tool_execution_node,
    trip_planner_node,
    itinerary_and_trip_node,
    booking_node,
    respond_node,
)


from app.modules.ai.agent.persistence import SQLAlchemyCheckpointSaver


def _with_db_lock(fn, *args, **kwargs):
    with SQLAlchemyCheckpointSaver._lock:
        return fn(*args, **kwargs)


def create_agent_graph(db: Session, user: User, checkpointer: Optional[BaseCheckpointSaver] = None):
    """Build and compile the unified LangGraph workflow for Namma AI with trip_planner sub-workflow."""

    workflow = StateGraph(AgentState)

    # 1. Define Nodes with contextual closure synchronized under DB lock
    workflow.add_node("understand_request", understand_request_node)
    workflow.add_node("load_user_context", lambda s: _with_db_lock(load_user_context_node, s, db=db, user=user))
    workflow.add_node("decide_actions", lambda s: _with_db_lock(decide_actions_node, s, db=db, user=user))
    workflow.add_node("trip_planner", lambda s: _with_db_lock(trip_planner_node, s, db=db, user=user))
    workflow.add_node("tool_execution", lambda s: _with_db_lock(tool_execution_node, s, db=db, user=user))
    workflow.add_node("booking", lambda s: _with_db_lock(booking_node, s, db=db, user=user))
    workflow.add_node("respond", respond_node)

    # 2. Define Workflow Edges
    workflow.add_edge(START, "understand_request")
    workflow.add_edge("understand_request", "load_user_context")
    workflow.add_edge("load_user_context", "decide_actions")

    # Conditional Branch from decide_actions:
    def route_after_decision(state: AgentState) -> str:
        if state.get("approval_required"):
            return "respond"
        if state.get("booking_intent") or state.get("cancellation_request") or state.get("modification_request"):
            return "booking"
        reqs = state.get("extracted_requirements") or {}
        has_active_trip = bool(state.get("itinerary") or state.get("trip_id"))
        if reqs.get("is_trip_plan") or reqs.get("is_refinement") or (has_active_trip and reqs.get("is_trip_action")):
            return "trip_planner"
        return "tool_execution"

    workflow.add_conditional_edges(
        "decide_actions",
        route_after_decision,
        {
            "respond": "respond",
            "booking": "booking",
            "trip_planner": "trip_planner",
            "tool_execution": "tool_execution",
        },
    )

    # Conditional Branch from tool_execution:
    def route_after_tool_execution(state: AgentState) -> str:
        reqs = state.get("extracted_requirements") or {}
        has_active_trip = bool(state.get("itinerary") or state.get("trip_id"))
        if reqs.get("is_trip_plan") or reqs.get("is_refinement") or (has_active_trip and reqs.get("is_trip_action")):
            return "trip_planner"
        return "respond"

    workflow.add_conditional_edges(
        "tool_execution",
        route_after_tool_execution,
        {
            "trip_planner": "trip_planner",
            "respond": "respond",
        },
    )

    workflow.add_edge("trip_planner", "respond")
    workflow.add_edge("booking", "respond")
    workflow.add_edge("respond", END)

    # Compile with persistent PostgreSQL / SQLite checkpointer
    return workflow.compile(checkpointer=checkpointer)
