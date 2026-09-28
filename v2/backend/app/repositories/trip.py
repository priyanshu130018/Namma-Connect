"""Trip Planning Repository for Database Operations on Trips, Days, Items, and AI Trip Plans."""

import json
import uuid
from typing import Optional, List, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from app.models.trip import Trip, TripDay, TripItem, AITripPlan


class TripRepository:
    """Encapsulates SQL queries for User Trips, Itinerary Days, Items, and AI Trip Plans."""

    @staticmethod
    def get_by_id(db: Session, trip_id: Any) -> Optional[Trip]:
        """Fetch trip by ID with eager loading."""
        try:
            return db.query(Trip).filter(Trip.id == trip_id).first()
        except Exception:
            return None

    @staticmethod
    def list_user_trips(
        db: Session,
        user_id: Any,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Trip]:
        """List trips for a specific user ordered by created_at desc."""
        query = db.query(Trip).filter(Trip.user_id == user_id)
        if status:
            query = query.filter(Trip.status == status.upper())
        return query.order_by(desc(Trip.created_at)).offset(offset).limit(limit).all()

    @staticmethod
    def create_trip(
        db: Session,
        user_id: Any,
        title: str,
        destination: str,
        description: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        origin: Optional[str] = None,
        status: str = "PLANNED",
        created_by: str = "USER",
        ai_generated: bool = False,
    ) -> Trip:
        """Create a new Trip entity."""
        trip = Trip(
            id=uuid.uuid4(),
            user_id=user_id,
            title=title,
            description=description,
            destination=destination,
            origin=origin,
            start_date=start_date,
            end_date=end_date,
            status=status,
            created_by=created_by,
            ai_generated=ai_generated,
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)
        return trip

    @staticmethod
    def add_day(
        db: Session,
        trip_id: Any,
        day_number: int,
        date: Optional[str] = None,
        title: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> TripDay:
        """Add an itinerary day to a trip."""
        day = TripDay(
            id=uuid.uuid4(),
            trip_id=trip_id,
            day_number=day_number,
            date=date,
            title=title,
            notes=notes,
        )
        db.add(day)
        db.commit()
        db.refresh(day)
        return day

    @staticmethod
    def add_item(
        db: Session,
        trip_day_id: Any,
        title: str,
        item_type: str = "SERVICE",
        service_id: Optional[Any] = None,
        provider_id: Optional[Any] = None,
        booking_id: Optional[Any] = None,
        description: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        duration_minutes: Optional[int] = None,
        sequence_order: int = 0,
        notes: Optional[str] = None,
        is_booked: bool = False,
    ) -> TripItem:
        """Add an activity/service item to an itinerary day."""
        item = TripItem(
            id=uuid.uuid4(),
            trip_day_id=trip_day_id,
            service_id=service_id,
            provider_id=provider_id,
            booking_id=booking_id,
            item_type=item_type,
            title=title,
            description=description,
            start_time=start_time,
            end_time=end_time,
            duration_minutes=duration_minutes,
            sequence_order=sequence_order,
            notes=notes,
            is_booked=is_booked,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def create_ai_trip_plan(
        db: Session,
        user_id: Any,
        prompt: str,
        trip_id: Optional[Any] = None,
        preferences: Optional[Dict[str, Any]] = None,
        constraints: Optional[Dict[str, Any]] = None,
        model: str = "gemini-3.5-flash-lite",
        status: str = "COMPLETED",
    ) -> AITripPlan:
        """Persist an AI Trip Plan generation record."""
        plan = AITripPlan(
            id=uuid.uuid4(),
            user_id=user_id,
            trip_id=trip_id,
            prompt=prompt,
            preferences_json=json.dumps(preferences or {}),
            constraints_json=json.dumps(constraints or {}),
            model=model,
            status=status,
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
        return plan

    @staticmethod
    def delete_trip(db: Session, trip: Trip) -> None:
        """Delete a trip and cascade to days and items."""
        db.delete(trip)
        db.commit()
