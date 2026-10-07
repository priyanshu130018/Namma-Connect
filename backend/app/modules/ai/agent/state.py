"""Structured LangGraph State contracts for Namma Connect Agent."""

from typing import Annotated, Any, Dict, List, Optional, Sequence
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict, total=False):
    """Authoritative persistent state for Namma AI LangGraph workflow.

    Maintains only what is required for multi-turn travel discovery,
    recommendation, validation, trip persistence, and authorized booking.
    """

    user_id: str
    conversation_id: str
    current_user_request: str
    messages: Annotated[Sequence[BaseMessage], add_messages]
    goal: Optional[str]
    hard_constraints: Dict[str, Any]
    soft_constraints: Dict[str, Any]
    extracted_requirements: Dict[str, Any]
    user_context: Dict[str, Any]
    memory_context: Dict[str, Any]
    search_candidates: List[Dict[str, Any]]
    search_results: List[Dict[str, Any]]
    selected_services: List[Dict[str, Any]]
    availability_results: List[Dict[str, Any]]
    pricing_results: Dict[str, Any]
    trip_id: Optional[str]
    itinerary: Optional[Dict[str, Any]]
    budget: Optional[Dict[str, Any]]
    booking_intent: bool
    booking_plan: Optional[Dict[str, Any]]
    guest_details: Optional[Dict[str, Any]]
    approval_required: bool
    approval_status: Optional[str]
    approval_prompt: Optional[str]
    approval_action: Optional[str]
    payment_status: Optional[str]
    booking_status: Optional[str]
    booking_state: Optional[Dict[str, Any]]
    modification_request: Optional[Dict[str, Any]]
    cancellation_request: Optional[Dict[str, Any]]
    notification_state: Optional[Dict[str, Any]]
    email_state: Optional[Dict[str, Any]]
    retry_state: Optional[Dict[str, Any]]
    changed_items: List[str]
    budget_too_low: bool
    budget_conflict: bool
    itinerary_valid: bool
    min_feasible_cost: Optional[float]
    min_price_in_district: Optional[float]
    errors: List[str]
    current_agent_step: str
    execution_trace: List[Dict[str, Any]]
    response_content: str
