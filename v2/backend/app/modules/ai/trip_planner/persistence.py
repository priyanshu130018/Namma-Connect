"""Persistence engine for saving AI trip planner itineraries to real database tables."""

import uuid
import json
from datetime import datetime
from sqlalchemy.orm import Session

from app.modules.user.domain.models import User
from app.modules.trip.domain.models import Trip, TripDay, TripItem, AITripPlan
from app.modules.marketplace.domain.models import Service
from app.modules.ai.trip_planner.state import PlannerState


class TripPersistenceEngine:
    """Persists confirmed planner proposals into authoritative Trip, TripDay, TripItem, and AITripPlan tables."""

    @classmethod
    def persist_itinerary(
        cls,
        db: Session,
        user: User,
        state: PlannerState,
        prompt_text: str = "Plan trip with AI",
    ) -> Trip:
        """Save proposed itinerary and link AI provenance record."""
        if not state.proposal:
            raise ValueError("Cannot persist trip without an itinerary proposal.")

        constraints = state.constraints
        destination = constraints.destination_district or "Karnataka"
        title = f"{constraints.duration_days}-Day {destination} Experience"

        # 1. Create Trip Container
        try:
            trip = Trip(
                id=uuid.uuid4(),
                user_id=user.id,
                title=title,
                description=state.proposal.summary or f"AI-assisted itinerary for {destination}",
                start_date=constraints.start_date,
                end_date=constraints.end_date,
                destination=destination,
                status="PLANNED",
                created_by="AI_ASSISTANT",
                ai_generated=True,
            )
            db.add(trip)
            db.flush()

            # 2. Create Days and Items
            for day_prop in state.proposal.days:
                trip_day = TripDay(
                    id=uuid.uuid4(),
                    trip_id=trip.id,
                    day_number=day_prop.day_number,
                    date=day_prop.date,
                    title=day_prop.title,
                    notes=day_prop.day_notes,
                )
                db.add(trip_day)
                db.flush()

                for seq, item_prop in enumerate(day_prop.items):
                    svc_uuid = uuid.UUID(item_prop.service_id) if item_prop.service_id else None
                    provider_uuid = None
                    if svc_uuid:
                        svc = db.query(Service).filter(Service.id == svc_uuid).first()
                        if svc:
                            provider_uuid = svc.provider_id

                    trip_item = TripItem(
                        id=uuid.uuid4(),
                        trip_day_id=trip_day.id,
                        service_id=svc_uuid,
                        provider_id=provider_uuid,
                        item_type=item_prop.category or "ACTIVITY",
                        title=item_prop.title,
                        description=item_prop.notes,
                        start_time=item_prop.start_time,
                        end_time=item_prop.end_time,
                        sequence_order=seq + 1,
                        notes=item_prop.notes,
                        is_booked=False,
                    )
                    db.add(trip_item)

            # 3. Create AITripPlan Provenance
            ai_plan = AITripPlan(
                id=uuid.uuid4(),
                trip_id=trip.id,
                user_id=user.id,
                prompt=prompt_text,
                preferences_json=json.dumps(constraints.preferred_categories),
                constraints_json=json.dumps(constraints.to_dict()),
                model="gemini-3.5-flash-lite",
                model_version="v2.0.0",
                status="COMPLETED",
                completed_at=datetime.utcnow(),
            )
            db.add(ai_plan)

            db.commit()
            db.refresh(trip)

            state.associated_trip_id = str(trip.id)
            return trip
        except Exception as e:
            db.rollback()
            raise e
