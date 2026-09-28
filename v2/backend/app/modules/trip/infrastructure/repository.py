"""Trip repository handling itinerary and trip items persistence."""

import uuid
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.modules.trip.domain.models import Trip, TripDay, TripItem, AITripPlan


class TripRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, trip_id) -> Optional[Trip]:
        if isinstance(trip_id, str):
            try:
                trip_id = uuid.UUID(trip_id)
            except ValueError:
                return None
        return self.db.query(Trip).filter(Trip.id == trip_id).first()

    def list_by_user(self, user_id, limit: int = 20, offset: int = 0) -> Tuple[List[Trip], int]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        q = self.db.query(Trip).filter(Trip.user_id == user_id)
        total = q.count()
        items = q.order_by(desc(Trip.created_at)).offset(offset).limit(limit).all()
        return items, total

    def save(self, trip: Trip) -> Trip:
        self.db.add(trip)
        self.db.commit()
        self.db.refresh(trip)
        return trip

    def delete(self, trip: Trip) -> None:
        self.db.delete(trip)
        self.db.commit()

    def save_day(self, day: TripDay) -> TripDay:
        self.db.add(day)
        self.db.commit()
        self.db.refresh(day)
        return day

    def save_item(self, item: TripItem) -> TripItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def get_item_by_id(self, item_id) -> Optional[TripItem]:
        if isinstance(item_id, str):
            try:
                item_id = uuid.UUID(item_id)
            except ValueError:
                return None
        return self.db.query(TripItem).filter(TripItem.id == item_id).first()

    def delete_item(self, item: TripItem) -> None:
        self.db.delete(item)
        self.db.commit()

    def save_ai_plan(self, plan: AITripPlan) -> AITripPlan:
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)
        return plan
