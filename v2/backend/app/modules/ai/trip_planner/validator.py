"""Deterministic validation engine for trip itineraries and constraints."""

import re
from datetime import datetime
from typing import List, Optional, Tuple
from app.modules.ai.trip_planner.state import (
    ItineraryProposal,
    TravelerConstraints,
    ValidationReport,
    ConflictReport,
    ItemProposal,
)


def parse_time_to_minutes(time_str: str) -> Optional[int]:
    """Parse time string like '09:00 AM', '14:30', '2:00 PM' into minutes from midnight."""
    if not time_str:
        return None
    s = time_str.strip().upper()
    match_12 = re.match(r"(\d{1,2}):(\d{2})\s*(AM|PM)", s)
    if match_12:
        hours = int(match_12.group(1))
        minutes = int(match_12.group(2))
        period = match_12.group(3)
        if period == "PM" and hours != 12:
            hours += 12
        elif period == "AM" and hours == 12:
            hours = 0
        return hours * 60 + minutes

    match_24 = re.match(r"(\d{1,2}):(\d{2})", s)
    if match_24:
        hours = int(match_24.group(1))
        minutes = int(match_24.group(2))
        return hours * 60 + minutes

    return None


class ItineraryValidator:
    """Performs deterministic arithmetic and constraint verification on trip proposals."""

    @classmethod
    def validate(
        cls,
        proposal: ItineraryProposal,
        constraints: TravelerConstraints,
    ) -> ValidationReport:
        """Validate all schedule constraints, timestamp overlaps, and budget limits."""
        conflicts: List[ConflictReport] = []
        warnings: List[str] = []
        total_cost: float = 0.0

        for day in proposal.days:
            # 1. Day time overlaps check
            time_ranges: List[Tuple[int, int, ItemProposal]] = []
            seen_service_ids = set()

            for item in day.items:
                total_cost += float(item.estimated_price or 0.0)

                # Duplicate service check within same day
                if item.service_id:
                    if item.service_id in seen_service_ids:
                        conflicts.append(
                            ConflictReport(
                                conflict_type="DUPLICATE_SERVICE",
                                day_number=day.day_number,
                                item_id=item.id,
                                service_id=item.service_id,
                                message=f"Service '{item.title}' is scheduled multiple times on Day {day.day_number}.",
                                suggested_action="Replace one occurrence with an alternative activity.",
                            )
                        )
                    seen_service_ids.add(item.service_id)

                # Time overlap check
                start_m = parse_time_to_minutes(item.start_time)
                end_m = parse_time_to_minutes(item.end_time)

                if start_m is not None and end_m is not None:
                    if end_m <= start_m:
                        conflicts.append(
                            ConflictReport(
                                conflict_type="INVALID_TIME_RANGE",
                                day_number=day.day_number,
                                item_id=item.id,
                                service_id=item.service_id,
                                message=f"End time '{item.end_time}' is earlier than or equal to start time '{item.start_time}' for '{item.title}'.",
                                suggested_action="Adjust activity duration or scheduling window.",
                            )
                        )
                    else:
                        for prev_start, prev_end, prev_item in time_ranges:
                            # Check overlap: (StartA < EndB) and (EndA > StartB)
                            if start_m < prev_end and end_m > prev_start:
                                conflicts.append(
                                    ConflictReport(
                                        conflict_type="TIME_OVERLAP",
                                        day_number=day.day_number,
                                        item_id=item.id,
                                        service_id=item.service_id,
                                        message=f"Schedule conflict on Day {day.day_number}: '{item.title}' ({item.start_time}-{item.end_time}) overlaps with '{prev_item.title}' ({prev_item.start_time}-{prev_item.end_time}).",
                                        suggested_action="Reschedule one of the overlapping activities to a later time slot.",
                                    )
                                )
                        time_ranges.append((start_m, end_m, item))

        # 2. Budget constraint check
        if constraints.max_budget and constraints.max_budget > 0:
            if total_cost > constraints.max_budget:
                diff = total_cost - constraints.max_budget
                conflicts.append(
                    ConflictReport(
                        conflict_type="BUDGET_EXCEEDED",
                        message=f"Estimated itinerary cost (₹{total_cost:.2f}) exceeds max budget of ₹{constraints.max_budget:.2f} by ₹{diff:.2f}.",
                        suggested_action="Swap premium accommodations or activities for budget-friendly alternatives.",
                    )
                )

        # 3. Pacing & Activity count warnings
        for day in proposal.days:
            if len(day.items) == 0:
                warnings.append(f"Day {day.day_number} has no scheduled activities.")
            elif len(day.items) > 4:
                warnings.append(f"Day {day.day_number} has {len(day.items)} activities which may feel rushed.")

        proposal.total_estimated_cost = round(total_cost, 2)

        return ValidationReport(
            is_valid=(len(conflicts) == 0),
            conflicts=conflicts,
            warnings=warnings,
            calculated_total_cost=round(total_cost, 2),
        )
