"""Agentic Trip Planner iterative orchestration loop."""

import uuid
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.modules.user.domain.models import User
from app.modules.trip.domain.models import Trip
from app.modules.ai.llm.base import LLMProvider
from app.modules.ai.llm.gemini_provider import GeminiProvider
from app.modules.ai.trip_planner.state import (
    PlannerState,
    PlannerStatus,
    TravelerConstraints,
    ItineraryProposal,
    ValidationReport,
)
from app.modules.ai.trip_planner.state_machine import PlannerStateMachine
from app.modules.ai.trip_planner.tools import TripPlannerTools
from app.modules.ai.trip_planner.builder import ItineraryBuilder
from app.modules.ai.trip_planner.validator import ItineraryValidator
from app.modules.ai.trip_planner.refiner import ItineraryRefiner
from app.modules.ai.trip_planner.handoff import BookingHandoffGenerator
from app.modules.ai.trip_planner.persistence import TripPersistenceEngine


class AgenticTripPlanner:
    """Multi-step iterative agentic orchestrator for multi-day trip synthesis and validation."""

    def __init__(
        self,
        db: Session,
        llm_provider: Optional[LLMProvider] = None,
    ):
        self.db = db
        self.llm_provider = llm_provider or GeminiProvider()
        self.tools = TripPlannerTools(db)

    def plan_trip(
        self,
        user: User,
        constraints: TravelerConstraints,
        prompt_text: str = "Plan trip with AI",
    ) -> PlannerState:
        """Execute end-to-end multi-step planning loop from requirements to validated proposal."""
        state = PlannerState(
            plan_id=str(uuid.uuid4()),
            user_id=str(user.id),
            status=PlannerStatus.DRAFT,
            constraints=constraints,
        )

        # 1. Evaluate Requirements & Clarification
        PlannerStateMachine.transition(state, PlannerStatus.COLLECTING_REQUIREMENTS)
        missing_fields = []
        if not constraints.destination_district:
            missing_fields.append("Which district in Karnataka would you like to explore (e.g. Kodagu, Chikkamagaluru, Mysuru)?")
        if not constraints.duration_days or constraints.duration_days <= 0:
            missing_fields.append("How many days will your trip be (e.g. 2 days, 3 days)?")
        if not constraints.party_size or constraints.party_size <= 0:
            missing_fields.append("How many travelers will be joining?")

        if missing_fields:
            state.clarification_questions = missing_fields
            return state

        # 2. Search Candidates
        PlannerStateMachine.transition(state, PlannerStatus.SEARCHING)
        category_filter = constraints.preferred_categories[0] if len(constraints.preferred_categories) == 1 else None
        candidates = self.tools.search_candidates(
            district=constraints.destination_district,
            category_slug=category_filter,
            max_price=constraints.max_budget,
            limit=20,
        )

        if not candidates or len(candidates) < 2:
            # Fallback search broader district or general Karnataka
            candidates = self.tools.search_candidates(
                district=constraints.destination_district,
                limit=20,
            )
            if not candidates:
                candidates = self.tools.search_candidates(limit=20)

        # 3. Build Initial Multi-Day Itinerary
        PlannerStateMachine.transition(state, PlannerStatus.BUILDING_ITINERARY)
        proposal = ItineraryBuilder.build_initial_itinerary(
            constraints=constraints,
            candidates=candidates,
        )
        state.proposal = proposal

        # 4. Deterministic Validation & Refinement Loop
        PlannerStateMachine.transition(state, PlannerStatus.VALIDATING)
        report = ItineraryValidator.validate(proposal, constraints)
        state.validation_report = report

        # Iterative auto-refinement if conflicts detected
        while not report.is_valid and state.iteration_count < state.max_iterations:
            state.iteration_count += 1
            PlannerStateMachine.transition(state, PlannerStatus.REFINING)

            for conflict in report.conflicts:
                if conflict.conflict_type == "TIME_OVERLAP":
                    ItineraryRefiner.resolve_overlap_conflict(proposal, conflict)
                elif conflict.conflict_type == "BUDGET_EXCEEDED":
                    cheaper_candidates = sorted(candidates, key=lambda s: float(s.price))
                    ItineraryRefiner.resolve_budget_conflict(proposal, constraints.max_budget or 100000.0, cheaper_candidates)

            # Re-validate
            PlannerStateMachine.transition(state, PlannerStatus.VALIDATING)
            report = ItineraryValidator.validate(proposal, constraints)
            state.validation_report = report

        # Transition to Ready for Review
        PlannerStateMachine.transition(state, PlannerStatus.READY_FOR_REVIEW)
        return state

    def refine_itinerary(
        self,
        user: User,
        state: PlannerState,
        action: str,  # "REPLACE", "REMOVE", "REDUCE_BUDGET"
        day_number: Optional[int] = None,
        item_id: Optional[str] = None,
        replacement_service_id: Optional[str] = None,
        target_budget: Optional[float] = None,
    ) -> PlannerState:
        """Apply targeted refinement to an existing itinerary proposal and re-validate."""
        if not state.proposal:
            state.last_error = "No proposal exists to refine."
            return state

        PlannerStateMachine.transition(state, PlannerStatus.REFINING)

        if action == "REMOVE" and day_number and item_id:
            ItineraryRefiner.remove_item(state.proposal, day_number, item_id)
        elif action == "REPLACE" and day_number and item_id and replacement_service_id:
            svc = self.tools.get_service_details(uuid.UUID(replacement_service_id))
            if svc:
                ItineraryRefiner.replace_item(state.proposal, day_number, item_id, svc)
        elif action == "REDUCE_BUDGET" and target_budget:
            state.constraints.max_budget = target_budget
            candidates = self.tools.search_candidates(
                district=state.constraints.destination_district,
                limit=10,
            )
            cheaper_candidates = sorted(candidates, key=lambda s: float(s.price))
            ItineraryRefiner.resolve_budget_conflict(state.proposal, target_budget, cheaper_candidates)

        # Re-validate after manual refinement
        PlannerStateMachine.transition(state, PlannerStatus.VALIDATING)
        report = ItineraryValidator.validate(state.proposal, state.constraints)
        state.validation_report = report

        PlannerStateMachine.transition(state, PlannerStatus.READY_FOR_REVIEW)
        return state

    def confirm_and_save_trip(
        self,
        user: User,
        state: PlannerState,
        prompt_text: str = "Plan trip with AI",
    ) -> Tuple[Trip, Dict[str, Any]]:
        """Persist itinerary to Trip/TripDay/TripItem and return clean booking handoff payload."""
        if not state.proposal:
            raise ValueError("No verified proposal to confirm.")

        # If already confirmed/handed off and associated with a trip, return idempotently
        if state.status in [PlannerStatus.CONFIRMED, PlannerStatus.HANDED_OFF] and state.associated_trip_id:
            trip_uuid = uuid.UUID(state.associated_trip_id)
            existing_trip = self.db.query(Trip).filter(Trip.id == trip_uuid).first()
            if existing_trip:
                handoff_payload = BookingHandoffGenerator.generate_handoff_payload(state, trip_id=str(existing_trip.id))
                return existing_trip, handoff_payload

        # Persist to database
        trip = TripPersistenceEngine.persist_itinerary(
            db=self.db,
            user=user,
            state=state,
            prompt_text=prompt_text,
        )

        PlannerStateMachine.transition(state, PlannerStatus.CONFIRMED)

        # Generate pre-booking checkout handoff payload
        handoff_payload = BookingHandoffGenerator.generate_handoff_payload(state, trip_id=str(trip.id))
        return trip, handoff_payload

    def handle_trip_turn(
        self,
        user: User,
        current_state: Optional[PlannerState],
        message: str,
        extracted_requirements: Dict[str, Any],
        existing_trip_id: Optional[str] = None,
    ) -> Tuple[PlannerState, List[str]]:
        """Orchestrate a single trip planner conversational turn (build or refine) with active trip context."""
        import re
        from datetime import datetime, timedelta

        lower = message.lower().strip()
        changed_items: List[str] = []

        # 1. Recover active trip context if not passed in memory
        target_trip_id = existing_trip_id or (current_state.associated_trip_id if current_state else None)
        if (not current_state or not current_state.proposal) and target_trip_id:
            try:
                t_uuid = uuid.UUID(str(target_trip_id))
                db_trip = self.db.query(Trip).filter(Trip.id == t_uuid).first()
                if db_trip:
                    current_state = PlannerState.from_trip_model(db_trip)
            except Exception:
                pass

        # 2. Determine if this turn modifies an existing trip or plans a new one
        has_active_trip = bool(current_state and current_state.proposal and current_state.proposal.days)
        is_refinement = extracted_requirements.get("is_refinement", False)

        # Detect modification keywords
        day_match = re.search(r"day\s*(\d+)", lower)
        target_day_num = int(day_match.group(1)) if day_match else None

        is_cheaper_request = any(w in lower for w in ["cheaper", "lower budget", "reduce budget", "reduce the budget", "budget to", "less expensive", "cut cost", "save money", "budget"])
        is_remove_request = any(w in lower for w in ["remove", "delete", "drop", "skip", "take out", "exclude"])
        is_hotel_request = any(w in lower for w in ["hotel", "stay", "resort", "homestay", "cottage", "accommodation"]) and any(w in lower for w in ["change", "replace", "different", "switch", "another"])
        is_add_request = any(w in lower for w in ["add", "include", "put in", "experience", "food", "dinner", "lunch", "workshop"]) and not any(w in lower for w in ["plan a", "create a"])
        is_replace_request = any(w in lower for w in ["replace", "change activity", "swap", "another option", "different option", "alternative"])

        is_modify_turn = has_active_trip and (
            is_refinement
            or is_cheaper_request
            or is_remove_request
            or is_hotel_request
            or is_add_request
            or is_replace_request
            or target_day_num is not None
            or not extracted_requirements.get("is_trip_plan")
        )

        if is_modify_turn and current_state and current_state.proposal:
            state = current_state
            proposal = state.proposal
            district = state.constraints.destination_district or extracted_requirements.get("destination_district") or "Kodagu"
            candidates = self.tools.search_candidates(district=district, limit=20)
            if not candidates:
                candidates = self.tools.search_candidates(limit=20)

            PlannerStateMachine.transition(state, PlannerStatus.REFINING)

            # A. Day-specific budget reduction ("Make Day 2 cheaper")
            if is_cheaper_request and target_day_num:
                cheaper_candidates = sorted(candidates, key=lambda s: float(s.price))
                changed = ItineraryRefiner.refine_day_budget(
                    proposal=proposal,
                    day_number=target_day_num,
                    cheaper_alternatives=cheaper_candidates,
                )
                changed_items.extend(changed)

            # B. Remove activity / keyword ("Remove trekking")
            elif is_remove_request:
                # Extract keyword after remove/delete
                kw_match = re.search(r"(?:remove|delete|drop|skip|take out|exclude)\s+([a-zA-Z\s]+)", lower)
                kw = kw_match.group(1).strip() if kw_match else ""
                # Clean up punctuation and stop words
                kw = re.sub(r"\b(the|from|my|trip|itinerary|activity|day\s*\d+)\b", "", kw).strip()
                if not kw and "trek" in lower:
                    kw = "trek"
                changed = ItineraryRefiner.remove_item_by_keyword(proposal=proposal, keyword=kw or "activity", day_number=target_day_num)
                changed_items.extend(changed)

            # C. Change hotel / stay ("Change my hotel")
            elif is_hotel_request:
                stay_candidates = [s for s in candidates if "stay" in (s.category_slug or s.category or "").lower() or "stay" in s.title.lower()]
                current_stay_ids = {it.service_id for d in proposal.days for it in d.items}
                alt_stays = [s for s in stay_candidates if str(s.id) not in current_stay_ids]
                if not alt_stays and stay_candidates:
                    alt_stays = stay_candidates
                if alt_stays:
                    changed = ItineraryRefiner.replace_item_by_category(proposal, "stay", alt_stays[0], day_number=target_day_num)
                    changed_items.extend(changed)

            # D. Add experience ("Add a local food experience")
            elif is_add_request:
                # Find matching activity candidate
                cat_filter = None
                if any(w in lower for w in ["food", "culinary", "dinner", "cooking"]):
                    cat_filter = "workshops"
                elif any(w in lower for w in ["tour", "plantation", "spice", "agro"]):
                    cat_filter = "agro-tours"
                act_candidates = [s for s in candidates if "stay" not in (s.category_slug or s.category or "").lower()]
                current_act_ids = {it.service_id for d in proposal.days for it in d.items}
                available_acts = [s for s in act_candidates if str(s.id) not in current_act_ids]
                target_act = available_acts[0] if available_acts else (act_candidates[0] if act_candidates else candidates[0] if candidates else None)
                if target_act:
                    target_day = target_day_num or (2 if len(proposal.days) >= 2 else 1)
                    new_id = ItineraryRefiner.add_item(proposal, day_number=target_day, new_service=target_act, notes=f"Added based on traveler request: {message}")
                    if new_id:
                        changed_items.append(new_id)

            # E. Replace activity / show another option ("Replace this activity", "Show me another option")
            elif is_replace_request:
                act_candidates = [s for s in candidates if "stay" not in (s.category_slug or s.category or "").lower()]
                current_act_ids = {it.service_id for d in proposal.days for it in d.items}
                available_acts = [s for s in act_candidates if str(s.id) not in current_act_ids]
                if available_acts and proposal.days:
                    target_day = target_day_num or 1
                    day_plan = next((d for d in proposal.days if d.day_number == target_day), proposal.days[0])
                    if day_plan.items:
                        old_item = day_plan.items[0]
                        ItineraryRefiner.replace_item(proposal, day_plan.day_number, old_item.id, available_acts[0])
                        changed_items.append(old_item.id)

            # F. General budget reduction ("Reduce the budget", "Make it cheaper")
            elif is_cheaper_request or extracted_requirements.get("max_budget"):
                target_budget = extracted_requirements.get("max_budget") or (proposal.total_estimated_cost * 0.8)
                state.constraints.max_budget = float(target_budget)
                cheaper_candidates = sorted(candidates, key=lambda s: float(s.price))
                prev_ids = {it.service_id for d in proposal.days for it in d.items}
                ItineraryRefiner.resolve_budget_conflict(proposal, float(target_budget), cheaper_candidates)
                for d in proposal.days:
                    for it in d.items:
                        if it.service_id not in prev_ids:
                            changed_items.append(it.id)

            # Re-validate after modification
            PlannerStateMachine.transition(state, PlannerStatus.VALIDATING)
            report = ItineraryValidator.validate(state.proposal, state.constraints)
            state.validation_report = report
            PlannerStateMachine.transition(state, PlannerStatus.READY_FOR_REVIEW)

        else:
            # 3. New Trip Planning Workflow
            district = extracted_requirements.get("destination_district") or "Kodagu"
            duration = extracted_requirements.get("duration_days", 2)
            party_size = extracted_requirements.get("party_size", 2)
            budget = extracted_requirements.get("max_budget")
            start_date_str = extracted_requirements.get("target_date") or (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
            end_date_str = (datetime.utcnow() + timedelta(days=7 + duration - 1)).strftime("%Y-%m-%d")

            constraints = TravelerConstraints(
                destination_district=district,
                duration_days=duration,
                party_size=party_size,
                max_budget=budget,
                start_date=start_date_str,
                end_date=end_date_str,
                preferred_categories=extracted_requirements.get("preferred_categories", []),
                pace="MODERATE",
                notes=message,
            )

            state = self.plan_trip(
                user=user,
                constraints=constraints,
                prompt_text=message or f"{duration}-day trip to {district}",
            )

        # 4. Persist Itinerary to DB
        if state.proposal:
            trip = TripPersistenceEngine.persist_itinerary(
                db=self.db,
                user=user,
                state=state,
                prompt_text=message or "Trip with AI",
                commit=False,
                trip_id=target_trip_id or state.associated_trip_id,
            )
            state.associated_trip_id = str(trip.id)

        return state, changed_items

