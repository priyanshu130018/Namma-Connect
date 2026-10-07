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
        """Swap highest priced items with cheaper alternatives matching category until within budget."""
        if proposal.total_estimated_cost <= max_budget:
            return True

        if not cheaper_alternatives:
            return False

        # Separate candidates into stays and activities
        cheaper_stays = sorted(
            [s for s in cheaper_alternatives if "stay" in (s.category_slug or s.category or "").lower() or "stay" in s.title.lower()],
            key=lambda s: float(s.price),
        )
        cheaper_acts = sorted(
            [s for s in cheaper_alternatives if s not in cheaper_stays],
            key=lambda s: float(s.price),
        )
        if not cheaper_stays:
            cheaper_stays = sorted(cheaper_alternatives, key=lambda s: float(s.price))
        if not cheaper_acts:
            cheaper_acts = sorted(cheaper_alternatives, key=lambda s: float(s.price))

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
            item_is_stay = "stay" in (item.category_slug or item.category or "").lower()
            candidates = cheaper_stays if item_is_stay else cheaper_acts
            valid_cheaper = [s for s in candidates if float(s.price) < item.estimated_price]
            if valid_cheaper:
                alt_svc = valid_cheaper[0]
                cls.replace_item(proposal, day_num, item.id, alt_svc)

        cls._recalculate_total(proposal)
        return proposal.total_estimated_cost <= max_budget


    @classmethod
    def refine_day_budget(
        cls,
        proposal: ItineraryProposal,
        day_number: int,
        cheaper_alternatives: List[Service],
        target_budget: Optional[float] = None,
    ) -> List[str]:
        """Make a specific day cheaper by swapping its items with lower-cost alternatives."""
        changed_ids: List[str] = []
        target_day = None
        for day in proposal.days:
            if day.day_number == day_number:
                target_day = day
                break

        if not target_day or not target_day.items or not cheaper_alternatives:
            return changed_ids

        # Sort day items descending by price
        sorted_day_items = sorted(target_day.items, key=lambda x: x.estimated_price, reverse=True)
        alt_idx = 0

        for item in sorted_day_items:
            while alt_idx < len(cheaper_alternatives):
                alt_svc = cheaper_alternatives[alt_idx]
                alt_idx += 1
                if float(alt_svc.price) < item.estimated_price:
                    # Check if stay vs activity category aligns
                    item_is_stay = "stay" in (item.category_slug or item.category or "").lower()
                    alt_is_stay = "stay" in (alt_svc.category_slug or alt_svc.category or "").lower()
                    if item_is_stay == alt_is_stay:
                        cls.replace_item(proposal, day_number, item.id, alt_svc)
                        changed_ids.append(item.id)
                        break

        cls._recalculate_total(proposal)
        return changed_ids

    @classmethod
    def remove_item_by_keyword(
        cls,
        proposal: ItineraryProposal,
        keyword: str,
        day_number: Optional[int] = None,
    ) -> List[str]:
        """Remove item(s) matching keyword (e.g. 'trekking', 'camp', 'spa') from itinerary."""
        kw = keyword.lower().strip()
        removed_ids: List[str] = []

        for day in proposal.days:
            if day_number is not None and day.day_number != day_number:
                continue
            to_remove = []
            for item in day.items:
                title_lower = (item.title or "").lower()
                cat_lower = (item.category or "").lower() + " " + (item.category_slug or "").lower()
                notes_lower = (item.notes or "").lower()
                if kw in title_lower or kw in cat_lower or kw in notes_lower:
                    to_remove.append(item.id)

            for it_id in to_remove:
                cls.remove_item(proposal, day.day_number, it_id)
                removed_ids.append(it_id)

        cls._recalculate_total(proposal)
        return removed_ids

    @classmethod
    def replace_item_by_category(
        cls,
        proposal: ItineraryProposal,
        category_keyword: str,
        new_service: Service,
        day_number: Optional[int] = None,
    ) -> List[str]:
        """Replace stay or activity matching category keyword (e.g. 'hotel', 'stay') with new service."""
        kw = category_keyword.lower().strip()
        changed_ids: List[str] = []

        for day in proposal.days:
            if day_number is not None and day.day_number != day_number:
                continue
            for item in day.items:
                title_lower = (item.title or "").lower()
                cat_lower = (item.category or "").lower() + " " + (item.category_slug or "").lower()
                is_match = (
                    kw in title_lower
                    or kw in cat_lower
                    or (kw in ["hotel", "stay", "resort", "homestay"] and any(s in cat_lower or s in title_lower for s in ["stay", "cottage", "resort", "homestay"]))
                )
                if is_match and item.service_id != str(new_service.id):
                    cls.replace_item(proposal, day.day_number, item.id, new_service)
                    changed_ids.append(item.id)
                    cls._recalculate_total(proposal)
                    return changed_ids

        cls._recalculate_total(proposal)
        return changed_ids

    @classmethod
    def add_item(
        cls,
        proposal: ItineraryProposal,
        day_number: int,
        new_service: Service,
        notes: Optional[str] = None,
    ) -> Optional[str]:
        """Add an experience or activity to a specific day."""
        target_day = None
        for day in proposal.days:
            if day.day_number == day_number:
                target_day = day
                break

        if not target_day:
            if proposal.days:
                target_day = proposal.days[0]
            else:
                return None

        # Determine time slot based on existing items
        standard_windows = [
            ("09:00 AM", "11:30 AM"),
            ("01:30 PM", "04:00 PM"),
            ("04:30 PM", "06:30 PM"),
            ("07:00 PM", "09:30 PM"),
        ]
        slot_idx = min(len(target_day.items), len(standard_windows) - 1)
        start_t, end_t = standard_windows[slot_idx]

        new_item = ItemProposal(
            id=str(uuid.uuid4()),
            service_id=str(new_service.id),
            title=new_service.title,
            category=new_service.category or "ACTIVITY",
            category_slug=new_service.category_slug or "agro-tours",
            location=new_service.location or "",
            district=new_service.district or "",
            start_time=start_t,
            end_time=end_t,
            estimated_price=float(new_service.price or 0.0),
            rating=float(new_service.rating or 4.8),
            primary_image=new_service.primary_image or "",
            provider_name=new_service.provider_name or "",
            notes=notes or f"Added {new_service.title}",
        )
        target_day.items.append(new_item)
        cls._recalculate_total(proposal)
        return new_item.id

    @classmethod
    def _recalculate_total(cls, proposal: ItineraryProposal):
        total = sum(item.estimated_price for day in proposal.days for item in day.items)
        proposal.total_estimated_cost = round(total, 2)
