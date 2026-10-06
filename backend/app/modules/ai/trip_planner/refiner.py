"""Itinerary refinement and conflict resolution engine."""

import uuid
from typing import List, Dict, Any, Optional
from app.modules.marketplace.domain.models import Service
from app.modules.ai.trip_planner.state import (
    ItineraryProposal,
    DayPlanProposal,
    ItemProposal,
    ConflictReport,
)


class ItineraryRefiner:
    """Modifies and resolves specific days or items in an itinerary proposal."""

    @classmethod
    def replace_item(
        cls,
        proposal: ItineraryProposal,
        day_number: int,
        item_id: str,
        new_service: Service,
    ) -> bool:
        """Replace a specific item in the itinerary with a new service."""
        for day in proposal.days:
            if day.day_number == day_number:
                for idx, item in enumerate(day.items):
                    if item.id == item_id or item.service_id == item_id:
                        day.items[idx] = ItemProposal(
                            id=str(uuid.uuid4()),
                            service_id=str(new_service.id),
                            title=new_service.title,
                            category=new_service.category,
                            category_slug=new_service.category_slug,
                            location=new_service.location,
                            district=new_service.district,
                            start_time=item.start_time,
                            end_time=item.end_time,
                            estimated_price=float(new_service.price),
                            rating=float(new_service.rating),
                            primary_image=new_service.primary_image,
                            provider_name=new_service.provider_name,
                            notes=f"Replaced activity with {new_service.title}",
                        )
                        cls._recalculate_total(proposal)
                        return True
        return False

    @classmethod
    def remove_item(
        cls,
        proposal: ItineraryProposal,
        day_number: int,
        item_id: str,
    ) -> bool:
        """Remove a specific item from a day plan."""
        for day in proposal.days:
            if day.day_number == day_number:
                initial_len = len(day.items)
                day.items = [item for item in day.items if item.id != item_id and item.service_id != item_id]
                if len(day.items) < initial_len:
                    cls._recalculate_total(proposal)
                    return True
        return False

    @classmethod
    def resolve_overlap_conflict(
        cls,
        proposal: ItineraryProposal,
        conflict: ConflictReport,
    ) -> bool:
        """Automatically adjust times to resolve a timestamp overlap conflict."""
        if not conflict.day_number:
            return False

        for day in proposal.days:
            if day.day_number == conflict.day_number:
                # Re-space all items cleanly across the day
                standard_windows = [
                    ("09:00 AM", "11:30 AM"),
                    ("01:30 PM", "04:00 PM"),
                    ("06:00 PM", "09:00 PM"),
                    ("09:30 PM", "10:30 PM"),
                ]
                for idx, item in enumerate(day.items):
                    if idx < len(standard_windows):
                        item.start_time = standard_windows[idx][0]
                        item.end_time = standard_windows[idx][1]
                cls._recalculate_total(proposal)
                return True
        return False

    @classmethod
    def resolve_budget_conflict(
        cls,
        proposal: ItineraryProposal,
        max_budget: float,
        cheaper_alternatives: List[Service],
    ) -> bool:
        """Swap highest priced items with cheaper alternatives until within budget."""
        if proposal.total_estimated_cost <= max_budget:
            return True

        if not cheaper_alternatives:
            return False

        alt_idx = 0
        # Sort items across all days by price descending
        all_items_with_day = [
            (day.day_number, item)
            for day in proposal.days
            for item in day.items
        ]
        all_items_with_day.sort(key=lambda x: x[1].estimated_price, reverse=True)

        for day_num, item in all_items_with_day:
            if proposal.total_estimated_cost <= max_budget:
                break
            if alt_idx < len(cheaper_alternatives):
                alt_svc = cheaper_alternatives[alt_idx]
                if float(alt_svc.price) < item.estimated_price:
                    cls.replace_item(proposal, day_num, item.id, alt_svc)
                    alt_idx += 1

        cls._recalculate_total(proposal)
        return proposal.total_estimated_cost <= max_budget

    @classmethod
    def _recalculate_total(cls, proposal: ItineraryProposal):
        total = sum(item.estimated_price for day in proposal.days for item in day.items)
        proposal.total_estimated_cost = round(total, 2)
