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
