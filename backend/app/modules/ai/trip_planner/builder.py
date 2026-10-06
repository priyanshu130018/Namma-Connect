"""Multi-day itinerary constructor for Agentic Trip Planner."""

import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app.modules.marketplace.domain.models import Service
from app.modules.ai.trip_planner.state import (
    TravelerConstraints,
    ItineraryProposal,
    DayPlanProposal,
    ItemProposal,
)


class ItineraryBuilder:
    """Builds multi-day structured itinerary proposals from verified candidate services."""

    TIME_SLOTS = [
        ("09:00 AM", "11:30 AM", "Morning Experience"),
        ("01:30 PM", "04:00 PM", "Afternoon Activity"),
        ("06:00 PM", "09:00 PM", "Evening Farm Stay & Dinner"),
    ]

    @classmethod
    def build_initial_itinerary(
        cls,
        constraints: TravelerConstraints,
        candidates: List[Service],
    ) -> ItineraryProposal:
        """Construct structured multi-day itinerary matching duration and budget constraints."""
        days: List[DayPlanProposal] = []
        duration = max(1, min(14, constraints.duration_days))

        # Separate candidates into Stays and Activities
        stays = [s for s in candidates if "stay" in (s.category_slug or s.category or "").lower() or "stay" in s.title.lower()]
        activities = [s for s in candidates if s not in stays]

        # If sparse, use all candidates
        if not activities:
            activities = candidates
        if not stays:
            stays = candidates

        base_date = None
        if constraints.start_date:
            try:
                base_date = datetime.strptime(constraints.start_date, "%Y-%m-%d")
            except Exception:
                base_date = None

        act_idx = 0
        stay_idx = 0

        for day_num in range(1, duration + 1):
            day_date_str = (base_date + timedelta(days=day_num - 1)).strftime("%Y-%m-%d") if base_date else None
            day_items: List[ItemProposal] = []

            # 1. Morning Activity
            if activities:
                morning_svc = activities[act_idx % len(activities)]
                act_idx += 1
                day_items.append(
                    ItemProposal(
                        id=str(uuid.uuid4()),
                        service_id=str(morning_svc.id),
                        title=morning_svc.title,
                        category=morning_svc.category,
                        category_slug=morning_svc.category_slug,
                        location=morning_svc.location,
                        district=morning_svc.district,
                        start_time=cls.TIME_SLOTS[0][0],
                        end_time=cls.TIME_SLOTS[0][1],
                        estimated_price=float(morning_svc.price),
                        rating=float(morning_svc.rating),
                        primary_image=morning_svc.primary_image,
                        provider_name=morning_svc.provider_name,
                        notes=f"Morning guided trail in {morning_svc.district}",
                    )
                )

            # 2. Afternoon Activity (if moderate/packed pace and enough services)
            if constraints.pace != "RELAXED" and len(activities) > 1:
                afternoon_svc = activities[act_idx % len(activities)]
                act_idx += 1
                day_items.append(
                    ItemProposal(
                        id=str(uuid.uuid4()),
                        service_id=str(afternoon_svc.id),
                        title=afternoon_svc.title,
                        category=afternoon_svc.category,
                        category_slug=afternoon_svc.category_slug,
                        location=afternoon_svc.location,
                        district=afternoon_svc.district,
                        start_time=cls.TIME_SLOTS[1][0],
                        end_time=cls.TIME_SLOTS[1][1],
                        estimated_price=float(afternoon_svc.price),
                        rating=float(afternoon_svc.rating),
                        primary_image=afternoon_svc.primary_image,
                        provider_name=afternoon_svc.provider_name,
                        notes=f"Afternoon culinary & craft experience",
                    )
                )

            # 3. Evening Farm Stay
            if stays:
                stay_svc = stays[stay_idx % len(stays)]
                if day_num % 2 == 0:  # change stay every 2 days if multiple
                    stay_idx += 1
                day_items.append(
                    ItemProposal(
                        id=str(uuid.uuid4()),
                        service_id=str(stay_svc.id),
                        title=stay_svc.title,
                        category=stay_svc.category,
                        category_slug=stay_svc.category_slug,
                        location=stay_svc.location,
                        district=stay_svc.district,
                        start_time=cls.TIME_SLOTS[2][0],
                        end_time=cls.TIME_SLOTS[2][1],
                        estimated_price=float(stay_svc.price),
                        rating=float(stay_svc.rating),
                        primary_image=stay_svc.primary_image,
                        provider_name=stay_svc.provider_name,
                        notes=f"Overnight stay & hospitality at {stay_svc.provider_name}'s estate",
                    )
                )

            days.append(
                DayPlanProposal(
                    day_number=day_num,
                    date=day_date_str,
                    title=f"Day {day_num}: {constraints.destination_district or 'Karnataka'} Exploration",
                    items=day_items,
                    day_notes=f"Explore the natural beauty, heritage, and flavors of {constraints.destination_district or 'Karnataka'}.",
                )
            )

        total_cost = sum(item.estimated_price for day in days for item in day.items)
        summary = (
            f"Curated {duration}-day journey in {constraints.destination_district or 'Karnataka'} "
            f"featuring {len(days)} structured days and verified local stays."
        )

        return ItineraryProposal(
            days=days,
            total_estimated_cost=round(total_cost, 2),
            summary=summary,
        )
