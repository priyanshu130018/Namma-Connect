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

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TravelerConstraints":
        if not data:
            return cls()
        return cls(
            destination_district=data.get("destination_district", "") or "",
            start_date=data.get("start_date"),
            end_date=data.get("end_date"),
            duration_days=int(data.get("duration_days") or 2),
            party_size=int(data.get("party_size") or 2),
            max_budget=float(data["max_budget"]) if data.get("max_budget") is not None else None,
            preferred_categories=list(data.get("preferred_categories") or []),
            special_interests=list(data.get("special_interests") or []),
            pace=data.get("pace", "MODERATE") or "MODERATE",
            notes=data.get("notes"),
        )


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

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ItemProposal":
        if not data:
            return cls()
        return cls(
            id=data.get("id") or str(uuid.uuid4()),
            service_id=str(data.get("service_id", "") or ""),
            title=data.get("title", "") or "",
            category=data.get("category", "ACTIVITY") or "ACTIVITY",
            category_slug=data.get("category_slug", "") or "",
            location=data.get("location", "") or "",
            district=data.get("district", "") or "",
            start_time=data.get("start_time", "09:00 AM") or "09:00 AM",
            end_time=data.get("end_time", "11:00 AM") or "11:00 AM",
            estimated_price=float(data.get("estimated_price") or 0.0),
            rating=float(data.get("rating") or 5.0),
            primary_image=data.get("primary_image", "") or "",
            provider_name=data.get("provider_name", "") or "",
            notes=data.get("notes", "") or "",
            is_availability_confirmed=bool(data.get("is_availability_confirmed", False)),
        )


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

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DayPlanProposal":
        if not data:
            return cls(day_number=1)
        return cls(
            day_number=int(data.get("day_number", 1)),
            date=data.get("date"),
            title=data.get("title", "Day Schedule") or "Day Schedule",
            items=[ItemProposal.from_dict(it) for it in data.get("items", [])],
            day_notes=data.get("day_notes"),
        )


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

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ItineraryProposal":
        if not data:
            return cls()
        return cls(
            days=[DayPlanProposal.from_dict(d) for d in data.get("days", [])],
            total_estimated_cost=float(data.get("total_estimated_cost") or 0.0),
            summary=data.get("summary", "") or "",
        )


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

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConflictReport":
        if not data:
            return cls(conflict_type="UNKNOWN")
        return cls(
            conflict_type=data.get("conflict_type", "UNKNOWN"),
            day_number=data.get("day_number"),
            item_id=data.get("item_id"),
            service_id=data.get("service_id"),
            message=data.get("message", ""),
            suggested_action=data.get("suggested_action", ""),
        )


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

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ValidationReport":
        if not data:
            return cls()
        return cls(
            is_valid=bool(data.get("is_valid", True)),
            conflicts=[ConflictReport.from_dict(c) for c in data.get("conflicts", [])],
            warnings=list(data.get("warnings", [])),
            calculated_total_cost=float(data.get("calculated_total_cost") or 0.0),
        )


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

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PlannerState":
        if not data:
            return cls()
        raw_status = data.get("status") or ("READY_FOR_REVIEW" if data.get("proposal") else "DRAFT")
        try:
            p_status = PlannerStatus(raw_status)
        except Exception:
            p_status = PlannerStatus.READY_FOR_REVIEW if data.get("proposal") else PlannerStatus.DRAFT
        return cls(
            plan_id=data.get("plan_id") or str(uuid.uuid4()),
            user_id=data.get("user_id"),
            status=p_status,
            constraints=TravelerConstraints.from_dict(data.get("constraints") or {}),
            proposal=ItineraryProposal.from_dict(data["proposal"]) if data.get("proposal") else None,
            validation_report=ValidationReport.from_dict(data["validation_report"]) if data.get("validation_report") else None,
            iteration_count=int(data.get("iteration_count") or 0),
            max_iterations=int(data.get("max_iterations") or 3),
            clarification_questions=list(data.get("clarification_questions") or []),
            associated_trip_id=data.get("associated_trip_id"),
            last_error=data.get("last_error"),
        )

    @classmethod
    def from_trip_model(cls, trip: Any) -> "PlannerState":
        """Reconstruct PlannerState from a database Trip entity."""
        days: List[DayPlanProposal] = []
        total_cost = 0.0

        for td in getattr(trip, "days", []):
            items: List[ItemProposal] = []
            for ti in getattr(td, "items", []):
                price = float(getattr(ti, "price", 0.0) or (getattr(ti.service, "price", 0.0) if getattr(ti, "service", None) else 0.0))
                total_cost += price
                items.append(
                    ItemProposal(
                        id=str(ti.id),
                        service_id=str(ti.service_id) if ti.service_id else "",
                        title=ti.title or (ti.service.title if getattr(ti, "service", None) else "Activity"),
                        category=ti.item_type or "ACTIVITY",
                        category_slug=getattr(ti.service, "category_slug", "") if getattr(ti, "service", None) else "",
                        location=getattr(ti.service, "location", "") if getattr(ti, "service", None) else "",
                        district=getattr(ti.service, "district", trip.destination or "") if getattr(ti, "service", None) else (trip.destination or ""),
                        start_time=ti.start_time or "09:00 AM",
                        end_time=ti.end_time or "11:00 AM",
                        estimated_price=price,
                        rating=float(getattr(ti.service, "rating", 4.8)) if getattr(ti, "service", None) else 4.8,
                        primary_image=getattr(ti.service, "primary_image", "") if getattr(ti, "service", None) else "",
                        provider_name=getattr(ti.service, "provider_name", "") if getattr(ti, "service", None) else "",
                        notes=ti.notes or "",
                        is_availability_confirmed=bool(ti.is_booked),
                    )
                )
            days.append(
                DayPlanProposal(
                    day_number=td.day_number,
                    date=str(td.date) if td.date else None,
                    title=td.title or f"Day {td.day_number}",
                    items=items,
                    day_notes=td.notes,
                )
            )

        duration = len(days) if days else 2
        constraints = TravelerConstraints(
            destination_district=trip.destination or "",
            start_date=str(trip.start_date) if trip.start_date else None,
            end_date=str(trip.end_date) if trip.end_date else None,
            duration_days=duration,
        )

        proposal = ItineraryProposal(
            days=days,
            total_estimated_cost=round(total_cost, 2),
            summary=trip.description or f"Itinerary for {trip.destination}",
        )

        return cls(
            plan_id=str(uuid.uuid4()),
            user_id=str(trip.user_id) if trip.user_id else None,
            status=PlannerStatus.READY_FOR_REVIEW,
            constraints=constraints,
            proposal=proposal,
            associated_trip_id=str(trip.id),
        )
