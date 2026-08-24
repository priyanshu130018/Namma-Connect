"""Booking Repository for Database Operations."""

from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, or_
from app.models.booking import Booking
from app.models.service import Service


class BookingRepository:
    """Encapsulates SQL operations for Bookings."""

    @staticmethod
    def create(db: Session, **kwargs) -> Booking:
        """Create a new booking in the database."""
        booking = Booking(**kwargs)
        db.add(booking)
        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def get_by_id(db: Session, booking_id: str) -> Optional[Booking]:
        """Fetch booking by primary key ID."""
        try:
            return (
                db.query(Booking)
                .options(joinedload(Booking.service), joinedload(Booking.customer), joinedload(Booking.payments))
                .filter(Booking.id == booking_id)
                .first()
            )
        except Exception:
            return None

    @staticmethod
    def get_by_code(db: Session, booking_code: str) -> Optional[Booking]:
        """Fetch booking by unique booking reference code."""
        return (
            db.query(Booking)
            .options(joinedload(Booking.service), joinedload(Booking.customer), joinedload(Booking.payments))
            .filter(Booking.booking_code == booking_code)
            .first()
        )

    @staticmethod
    def list_by_customer(db: Session, customer_id: str) -> List[Booking]:
        """Fetch all bookings created by a customer, ordered by newest first."""
        try:
            return (
                db.query(Booking)
                .options(joinedload(Booking.service), joinedload(Booking.payments))
                .filter(Booking.customer_id == customer_id)
                .order_by(desc(Booking.created_at))
                .all()
            )
        except Exception:
            return []

    @staticmethod
    def list_by_provider(db: Session, provider_id: str) -> List[Booking]:
        """Fetch all bookings for services hosted/managed by a given provider."""
        try:
            return (
                db.query(Booking)
                .join(Service, Booking.service_id == Service.id)
                .options(joinedload(Booking.service), joinedload(Booking.customer), joinedload(Booking.payments))
                .filter(
                    or_(
                        Booking.provider_id == provider_id,
                        Service.provider_id == provider_id,
                    )
                )
                .order_by(desc(Booking.created_at))
                .all()
            )
        except Exception:
            return []

    @staticmethod
    def update_status(db: Session, booking_id: str, new_status: str) -> Optional[Booking]:
        """Update the status of an existing booking."""
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            booking = BookingRepository.get_by_code(db, booking_id)
        if booking:
            booking.status = new_status
            db.commit()
            db.refresh(booking)
        return booking

    @staticmethod
    def count(db: Session) -> int:
        """Count total bookings."""
        return db.query(Booking).count()
