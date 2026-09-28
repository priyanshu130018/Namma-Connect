"""AI Assistant conversational orchestrator."""

import json
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.modules.user.domain.models import User
from app.modules.ai.domain.models import AIMessage
from app.modules.ai.llm.base import LLMProvider, LLMResponse
from app.modules.ai.tools.registry import AIToolRegistry
from app.modules.ai.prompts.system_prompts import AI_ASSISTANT_SYSTEM_PROMPT
from app.modules.ai.assistant.intent_router import IntentRouter, ExtractedIntent
from app.modules.ai.assistant.context_builder import ContextBuilder
from app.modules.ai.trip_planner.handoff import TripPlannerHandoffRequest


@dataclass
class OrchestrationResult:
    content: str
    intent: str
    tool_calls_executed: List[Dict[str, Any]] = field(default_factory=list)
    recommended_services: List[Dict[str, Any]] = field(default_factory=list)
    trip_planner_handoff: Optional[Dict[str, Any]] = None
    tokens_used: int = 0


class AIAssistantOrchestrator:
    """Orchestrates intent classification, authorized tool execution, and grounded LLM generation."""

    def __init__(
        self,
        db: Session,
        llm_provider: LLMProvider,
        tool_registry: Optional[AIToolRegistry] = None,
    ):
        self.db = db
        self.llm_provider = llm_provider
        self.tool_registry = tool_registry or AIToolRegistry(db)

    def process_turn(
        self,
        user: User,
        current_message: str,
        history: List[AIMessage],
    ) -> OrchestrationResult:
        """Process a single conversational turn end-to-end."""
        # 1. Intent Classification
        extracted_intent: ExtractedIntent = IntentRouter.classify_intent(current_message)
        intent = extracted_intent.intent
        entities = extracted_intent.entities

        tool_calls_executed: List[Dict[str, Any]] = []
        recommended_services: List[Dict[str, Any]] = []
        tool_summary_text: Optional[str] = None
        handoff_payload: Optional[Dict[str, Any]] = None

        # 2. Tool Execution based on Intent
        if intent == "TRIP_PLANNER_HANDOFF":
            handoff = TripPlannerHandoffRequest(
                destination_district=entities.get("destination_district"),
                budget_limit=entities.get("max_budget"),
                party_size=entities.get("party_size") or 2,
                preferred_categories=[entities["category_slug"]] if entities.get("category_slug") else [],
                notes=current_message,
            )
            handoff_payload = handoff.to_dict()

            search_res = self.tool_registry.execute_tool(
                name="search_services",
                user=user,
                arguments={
                    "district": entities.get("destination_district"),
                    "category_slug": entities.get("category_slug"),
                    "limit": 3,
                },
            )
            tool_calls_executed.append({
                "tool": "search_services",
                "arguments": entities,
                "result": search_res,
            })
            services_found = search_res.get("services", [])
            recommended_services = services_found
            tool_summary_text = f"Found {len(services_found)} services in {entities.get('destination_district') or 'Karnataka'}."

        elif intent == "MARKETPLACE_SEARCH":
            search_args = {
                "district": entities.get("destination_district"),
                "category_slug": entities.get("category_slug"),
                "max_price": entities.get("max_budget"),
                "query": current_message,
                "limit": 5,
            }
            tool_res = self.tool_registry.execute_tool(
                name="search_services",
                user=user,
                arguments=search_args,
            )
            tool_calls_executed.append({
                "tool": "search_services",
                "arguments": search_args,
                "result": tool_res,
            })
            services_found = tool_res.get("services", [])
            recommended_services = services_found

            if services_found:
                items_str = "\n".join(
                    f"- {s['title']} in {s['district']} (₹{s['price']}/{s['unit']}, Rating: {s['rating']}★, Host: {s['provider_name']})"
                    for s in services_found
                )
                tool_summary_text = f"Verified Listings Found ({len(services_found)}):\n{items_str}"
            else:
                tool_summary_text = "No published services found matching the criteria in the database."

        elif intent == "RECOMMENDATION":
            rec_res = self.tool_registry.execute_tool(
                name="get_user_recommendations",
                user=user,
                arguments={"limit": 5},
            )
            tool_calls_executed.append({
                "tool": "get_user_recommendations",
                "arguments": {"limit": 5},
                "result": rec_res,
            })
            recs = rec_res.get("recommendations", [])
            recommended_services = [r.get("service_details") for r in recs if r.get("service_details")]

            if recs:
                items_str = "\n".join(
                    f"- {r.get('service_details', {}).get('title')} ({r.get('explanation')})"
                    for r in recs if r.get("service_details")
                )
                tool_summary_text = f"Personalized Recommendations Found:\n{items_str}"
            else:
                tool_summary_text = "No personalized recommendations available."

        elif intent == "AVAILABILITY_CHECK":
            search_res = self.tool_registry.execute_tool(
                name="search_services",
                user=user,
                arguments={"district": entities.get("destination_district"), "limit": 3},
            )
            tool_calls_executed.append({
                "tool": "search_services",
                "arguments": entities,
                "result": search_res,
            })
            services_found = search_res.get("services", [])
            recommended_services = services_found
            tool_summary_text = f"Availability checked for {len(services_found)} listings in {entities.get('destination_district') or 'Karnataka'}."

        # 3. Build Bounded Context for LLM
        llm_messages = ContextBuilder.build_llm_messages(
            history=history,
            current_message=current_message,
            user=user,
            tool_results_summary=tool_summary_text,
        )

        # 4. Generate Grounded Response from LLM Provider
        llm_resp: LLMResponse = self.llm_provider.chat(
            messages=llm_messages,
            system_instruction=AI_ASSISTANT_SYSTEM_PROMPT,
            temperature=0.2,
            max_tokens=800,
        )

        final_content = llm_resp.content

        # 5. Strict Grounding Enforcement: If search tool returned 0 results, ensure output explicitly states no results found
        if intent == "MARKETPLACE_SEARCH" and not recommended_services:
            dist = entities.get("destination_district") or "your requested area"
            final_content = (
                f"I searched our verified marketplace listings for {dist}, "
                f"but there are currently no available stays matching those exact criteria. "
                f"Would you like to explore nearby districts such as Kodagu or Chikkamagaluru?"
            )

        # If trip planner handoff, ensure handoff context is communicated
        if intent == "TRIP_PLANNER_HANDOFF":
            if not final_content or "welcome" in final_content.lower() or "look up" in final_content.lower():
                dist = entities.get("destination_district") or "Karnataka"
                final_content = (
                    f"I've gathered your trip requirements for {dist}. "
                    f"Our specialized multi-day Trip Planner is ready to build your day-by-day itinerary and activity schedule."
                )

        return OrchestrationResult(
            content=final_content,
            intent=intent,
            tool_calls_executed=tool_calls_executed,
            recommended_services=recommended_services,
            trip_planner_handoff=handoff_payload,
            tokens_used=llm_resp.tokens_used,
        )
