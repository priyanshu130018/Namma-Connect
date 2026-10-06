"""Booking and planning handoff contracts for the Agentic Trip Planner."""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from app.modules.ai.trip_planner.state import PlannerState, ItineraryProposal


@dataclass
class TripPlannerHandoffRequest:
    """Structured intent and parameters to hand off from AI Assistant to Trip Planner."""
    destination_district: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_days: int = 2
    party_size: int = 2
    budget_limit: Optional[float] = None
    preferred_categories: List[str] = field(default_factory=list)
    special_interests: List[str] = field(default_factory=list)
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "handoff_ready": True,
            "target_module": "trip_planner",
            "parameters": {
                "destination_district": self.destination_district,
                "start_date": self.start_date,
                "end_date": self.end_date,
                "duration_days": self.duration_days,
                "party_size": self.party_size,
                "budget_limit": self.budget_limit,
                "preferred_categories": self.preferred_categories,
                "special_interests": self.special_interests,
                "notes": self.notes,
            },
            "status": "HANDOFF_PENDING",
            "message": "Structured travel parameters extracted for multi-day Trip Planner synthesis.",
        }


@dataclass
class BookingHandoffItem:
    service_id: str
    title: str
    category: str
    district: str
    date: Optional[str]
    start_time: str
    end_time: str
    party_size: int
    estimated_price: float
    trip_item_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "service_id": self.service_id,
            "title": self.title,
            "category": self.category,
            "district": self.district,
            "date": self.date,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "party_size": self.party_size,
            "estimated_price": self.estimated_price,
            "trip_item_id": self.trip_item_id,
        }


class BookingHandoffGenerator:
    """Constructs a clean, authoritative booking handoff payload without creating premature transactions."""

    @classmethod
    def generate_handoff_payload(
        cls,
        state: PlannerState,
        trip_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate structured checkout payload for user-initiated booking/payment."""
        if not state.proposal:
            return {
                "handoff_ready": False,
                "message": "No confirmed itinerary proposal available for booking handoff.",
            }

        items_to_book: List[BookingHandoffItem] = []
        party_size = state.constraints.party_size or 2

        for day in state.proposal.days:
            for item in day.items:
                if item.service_id:
                    items_to_book.append(
                        BookingHandoffItem(
                            service_id=item.service_id,
                            title=item.title,
                            category=item.category,
                            district=item.district,
                            date=day.date,
                            start_time=item.start_time,
                            end_time=item.end_time,
                            party_size=party_size,
                            estimated_price=item.estimated_price,
                            trip_item_id=item.id,
                        )
                    )

        total_price = sum(it.estimated_price for it in items_to_book)

        return {
            "handoff_ready": True,
            "plan_id": state.plan_id,
            "trip_id": trip_id or state.associated_trip_id,
            "destination": state.constraints.destination_district,
            "start_date": state.constraints.start_date,
            "end_date": state.constraints.end_date,
            "party_size": party_size,
            "total_items_count": len(items_to_book),
            "estimated_subtotal": round(total_price, 2),
            "items_to_book": [it.to_dict() for it in items_to_book],
            # Authoritative boundary flags
            "bookings_created": False,
            "payment_created": False,
            "checkout_url": f"/app/trips/{trip_id or state.associated_trip_id}/checkout",
            "message": "Itinerary verified and ready for customer checkout in the booking module.",
        }
