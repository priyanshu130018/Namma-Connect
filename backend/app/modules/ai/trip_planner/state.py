"""Structured state definitions for the Agentic Trip Planner."""

import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Any, List, Optional
from decimal import Decimal


class PlannerStatus(str, Enum):
    """Explicit Lifecycle States of the Trip Planner."""
    DRAFT = "DRAFT"
    COLLECTING_REQUIREMENTS = "COLLECTING_REQUIREMENTS"
    SEARCHING = "SEARCHING"
    BUILDING_ITINERARY = "BUILDING_ITINERARY"
    VALIDATING = "VALIDATING"
    REFINING = "REFINING"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    CONFIRMED = "CONFIRMED"
    HANDED_OFF = "HANDED_OFF"
    FAILED = "FAILED"


@dataclass
class TravelerConstraints:
    """Structured travel requirements and constraints."""
    destination_district: str = ""
    start_date: Optional[str] = None  # YYYY-MM-DD
    end_date: Optional[str] = None    # YYYY-MM-DD
    duration_days: int = 2
    party_size: int = 2
    max_budget: Optional[float] = None
    preferred_categories: List[str] = field(default_factory=list)
    special_interests: List[str] = field(default_factory=list)
    pace: str = "MODERATE"  # "RELAXED", "MODERATE", "PACKED"
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "destination_district": self.destination_district,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "duration_days": self.duration_days,
            "party_size": self.party_size,
            "max_budget": self.max_budget,
            "preferred_categories": self.preferred_categories,
            "special_interests": self.special_interests,
            "pace": self.pace,
            "notes": self.notes,
        }


@dataclass
class ItemProposal:
    """Single activity or stay proposal within a day plan."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    service_id: str = ""
    title: str = ""
    category: str = "ACTIVITY"
    category_slug: str = ""
    location: str = ""
    district: str = ""
    start_time: str = "09:00 AM"
    end_time: str = "11:00 AM"
    estimated_price: float = 0.0
    rating: float = 5.0
    primary_image: str = ""
    provider_name: str = ""
    notes: str = ""
    is_availability_confirmed: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "service_id": self.service_id,
            "title": self.title,
            "category": self.category,
            "category_slug": self.category_slug,
            "location": self.location,
            "district": self.district,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "estimated_price": self.estimated_price,
            "rating": self.rating,
            "primary_image": self.primary_image,
            "provider_name": self.provider_name,
            "notes": self.notes,
            "is_availability_confirmed": self.is_availability_confirmed,
        }


@dataclass
class DayPlanProposal:
    """Proposed schedule for a single trip day."""
    day_number: int
    date: Optional[str] = None
    title: str = "Day Schedule"
    items: List[ItemProposal] = field(default_factory=list)
    day_notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "day_number": self.day_number,
            "date": self.date,
            "title": self.title,
            "items": [item.to_dict() for item in self.items],
            "day_notes": self.day_notes,
        }


@dataclass
class ItineraryProposal:
    """Complete multi-day proposed itinerary."""
    days: List[DayPlanProposal] = field(default_factory=list)
    total_estimated_cost: float = 0.0
    summary: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "days": [day.to_dict() for day in self.days],
            "total_estimated_cost": self.total_estimated_cost,
            "summary": self.summary,
        }


@dataclass
class ConflictReport:
    """Individual constraint conflict detected during validation."""
    conflict_type: str  # "TIME_OVERLAP", "CAPACITY_EXCEEDED", "DATE_OUT_OF_BOUNDS", "BUDGET_EXCEEDED", "UNAVAILABLE"
    day_number: Optional[int] = None
    item_id: Optional[str] = None
    service_id: Optional[str] = None
    message: str = ""
    suggested_action: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "conflict_type": self.conflict_type,
            "day_number": self.day_number,
            "item_id": self.item_id,
            "service_id": self.service_id,
            "message": self.message,
            "suggested_action": self.suggested_action,
        }


@dataclass
class ValidationReport:
    """Comprehensive validation result for an itinerary proposal."""
    is_valid: bool = True
    conflicts: List[ConflictReport] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    calculated_total_cost: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "conflicts": [c.to_dict() for c in self.conflicts],
            "warnings": self.warnings,
            "calculated_total_cost": self.calculated_total_cost,
        }


@dataclass
class PlannerState:
    """Authoritative structured state of an agentic trip planning session."""
    plan_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    status: PlannerStatus = PlannerStatus.DRAFT
    constraints: TravelerConstraints = field(default_factory=TravelerConstraints)
    proposal: Optional[ItineraryProposal] = None
    validation_report: Optional[ValidationReport] = None
    iteration_count: int = 0
    max_iterations: int = 3
    clarification_questions: List[str] = field(default_factory=list)
    associated_trip_id: Optional[str] = None
    last_error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "plan_id": self.plan_id,
            "user_id": self.user_id,
            "status": self.status.value,
            "constraints": self.constraints.to_dict(),
            "proposal": self.proposal.to_dict() if self.proposal else None,
            "validation_report": self.validation_report.to_dict() if self.validation_report else None,
            "iteration_count": self.iteration_count,
            "clarification_questions": self.clarification_questions,
            "associated_trip_id": self.associated_trip_id,
            "last_error": self.last_error,
        }
