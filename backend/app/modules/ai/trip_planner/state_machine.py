"""Explicit state machine governing PlannerState lifecycle transitions."""

from typing import Set, Dict
from app.modules.ai.trip_planner.state import PlannerStatus, PlannerState


class PlannerStateTransitionError(Exception):
    """Raised when an illegal lifecycle state transition is attempted."""
    pass


class PlannerStateMachine:
    """Manages and validates transitions through the trip planner lifecycle."""

    # Allowed transitions graph
    ALLOWED_TRANSITIONS: Dict[PlannerStatus, Set[PlannerStatus]] = {
        PlannerStatus.DRAFT: {
            PlannerStatus.COLLECTING_REQUIREMENTS,
            PlannerStatus.SEARCHING,
            PlannerStatus.REFINING,
            PlannerStatus.FAILED,
        },
        PlannerStatus.COLLECTING_REQUIREMENTS: {
            PlannerStatus.COLLECTING_REQUIREMENTS,
            PlannerStatus.SEARCHING,
            PlannerStatus.FAILED,
        },
        PlannerStatus.SEARCHING: {
            PlannerStatus.BUILDING_ITINERARY,
            PlannerStatus.COLLECTING_REQUIREMENTS,
            PlannerStatus.FAILED,
        },
        PlannerStatus.BUILDING_ITINERARY: {
            PlannerStatus.VALIDATING,
            PlannerStatus.FAILED,
        },
        PlannerStatus.VALIDATING: {
            PlannerStatus.READY_FOR_REVIEW,
            PlannerStatus.REFINING,
            PlannerStatus.FAILED,
        },
        PlannerStatus.REFINING: {
            PlannerStatus.SEARCHING,
            PlannerStatus.BUILDING_ITINERARY,
            PlannerStatus.VALIDATING,
            PlannerStatus.FAILED,
        },
        PlannerStatus.READY_FOR_REVIEW: {
            PlannerStatus.REFINING,
            PlannerStatus.CONFIRMED,
            PlannerStatus.FAILED,
        },
        PlannerStatus.CONFIRMED: {
            PlannerStatus.REFINING,
            PlannerStatus.HANDED_OFF,
            PlannerStatus.FAILED,
        },
        PlannerStatus.HANDED_OFF: {
            PlannerStatus.REFINING,
        },
        PlannerStatus.FAILED: {
            PlannerStatus.DRAFT,  # Can restart from draft
        },
    }

    @classmethod
    def can_transition(cls, from_status: PlannerStatus, to_status: PlannerStatus) -> bool:
        """Check if transition is permitted."""
        return to_status in cls.ALLOWED_TRANSITIONS.get(from_status, set())

    @classmethod
    def transition(cls, state: PlannerState, target_status: PlannerStatus) -> PlannerState:
        """Execute state transition or raise PlannerStateTransitionError."""
        if state.status == target_status:
            return state

        if not cls.can_transition(state.status, target_status):
            raise PlannerStateTransitionError(
                f"Invalid state transition: Cannot move from {state.status.value} to {target_status.value}."
            )

        state.status = target_status
        return state
