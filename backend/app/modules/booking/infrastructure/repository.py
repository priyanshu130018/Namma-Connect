"""Booking repository handling database queries."""

import uuid
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.modules.booking.domain.models import Booking


class BookingRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, booking_id) -> Optional[Booking]:
        if isinstance(booking_id, str):
            try:
                booking_id = uuid.UUID(booking_id)
            except ValueError:
                return None
        return self.db.query(Booking).filter(Booking.id == booking_id).first()

    def get_by_booking_number(self, booking_number: str) -> Optional[Booking]:
        return self.db.query(Booking).filter(Booking.booking_code == booking_number).first()

    def get_by_code(self, booking_code: str) -> Optional[Booking]:
        return self.db.query(Booking).filter(Booking.booking_code == booking_code).first()

    def list_by_user(
        self,
        user_id,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Booking], int]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        q = self.db.query(Booking).filter(Booking.customer_id == user_id)
        if status:
            q = q.filter(Booking.status == status)
        total = q.count()
        items = q.order_by(desc(Booking.created_at)).offset(offset).limit(limit).all()
        return items, total

    def list_by_provider(
        self,
        provider_id,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Booking], int]:
        if isinstance(provider_id, str):
            provider_id = uuid.UUID(provider_id)
        q = self.db.query(Booking).filter(Booking.provider_id == provider_id)
        if status:
            q = q.filter(Booking.status == status)
        total = q.count()
        items = q.order_by(desc(Booking.created_at)).offset(offset).limit(limit).all()
        return items, total

    def list_all(
        self,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Booking], int]:
        q = self.db.query(Booking)
        if status:
            q = q.filter(Booking.status == status)
        total = q.count()
        items = q.order_by(desc(Booking.created_at)).offset(offset).limit(limit).all()
        return items, total

    def save(self, booking: Booking) -> Booking:
        self.db.add(booking)
        self.db.commit()
        self.db.refresh(booking)
        return booking
