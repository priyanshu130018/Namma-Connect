"""Trip application service."""

import uuid
from datetime import timedelta, date, datetime
from typing import Dict, Any, List
from fastapi import HTTPException, status
from app.modules.trip.infrastructure.repository import TripRepository
from app.modules.trip.presentation.schemas import TripCreateRequest, TripItemCreateRequest
from app.modules.trip.domain.models import Trip, TripDay, TripItem
from app.modules.user.domain.models import User


class TripService:
    def __init__(self, repo: TripRepository):
        self.repo = repo

    def create_trip(self, user: User, payload: TripCreateRequest) -> Dict[str, Any]:
        if payload.end_date < payload.start_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date cannot be earlier than start date.")

        trip = Trip(
            user_id=user.id,
            title=payload.title.strip(),
            description=payload.notes,
            start_date=payload.start_date.isoformat(),
            end_date=payload.end_date.isoformat(),
            destination=payload.destination_district or "Karnataka",
            status="PLANNING",
            created_by="USER",
        )
        saved = self.repo.save(trip)

        # Generate initial days
        delta = (payload.end_date - payload.start_date).days + 1
        for i in range(min(delta, 30)):  # capped at 30 days
            day_date = payload.start_date + timedelta(days=i)
            day = TripDay(
                trip_id=saved.id,
                day_number=i + 1,
                date=day_date.isoformat(),
                title=f"Day {i + 1}",
            )
            self.repo.save_day(day)

        # Reload
        reloaded = self.repo.get_by_id(saved.id)
        return self._serialize_trip(reloaded)

    def get_trip(self, user: User, trip_id: str) -> Dict[str, Any]:
        trip = self.repo.get_by_id(trip_id)
        if not trip:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
        if str(trip.user_id) != str(user.id) and user.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")
        return self._serialize_trip(trip)

    def list_trips(self, user: User, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        offset = (page - 1) * page_size
        items, total = self.repo.list_by_user(user_id=user.id, limit=page_size, offset=offset)
        return {
            "items": [self._serialize_trip(t) for t in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1,
        }

    def add_trip_item(self, user: User, trip_id: str, payload: TripItemCreateRequest) -> Dict[str, Any]:
        trip = self.repo.get_by_id(trip_id)
        if not trip:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
        if str(trip.user_id) != str(user.id) and user.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

        day_uuid = uuid.UUID(payload.trip_day_id) if payload.trip_day_id else None
        service_uuid = uuid.UUID(payload.service_id) if payload.service_id else None
        booking_uuid = uuid.UUID(payload.booking_id) if payload.booking_id else None

        item = TripItem(
            trip_day_id=day_uuid,
            service_id=service_uuid,
            booking_id=booking_uuid,
            title=payload.title.strip(),
            item_type=payload.category or "ACTIVITY",
            start_time=payload.start_time,
            end_time=payload.end_time,
            sequence_order=payload.sort_order or 0,
            notes=payload.notes,
        )
        saved = self.repo.save_item(item)
        return self._serialize_trip_item(saved, trip_id=trip.id)

    def delete_trip_item(self, user: User, trip_id: str, item_id: str) -> Dict[str, Any]:
        trip = self.repo.get_by_id(trip_id)
        if not trip:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
        if str(trip.user_id) != str(user.id) and user.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

        item = self.repo.get_item_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip item not found.")

        self.repo.delete_item(item)
        return {"success": True, "message": "Trip item deleted."}

    def delete_trip(self, user: User, trip_id: str) -> Dict[str, Any]:
        trip = self.repo.get_by_id(trip_id)
        if not trip:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
        if str(trip.user_id) != str(user.id) and user.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

        self.repo.delete(trip)
        return {"success": True, "message": "Trip deleted."}

    def _serialize_trip_item(self, item: TripItem, trip_id=None) -> Dict[str, Any]:
        return {
            "id": str(item.id),
            "trip_day_id": str(item.trip_day_id) if item.trip_day_id else None,
            "trip_id": str(trip_id) if trip_id else "",
            "service_id": str(item.service_id) if item.service_id else None,
            "booking_id": str(item.booking_id) if item.booking_id else None,
            "title": item.title,
            "category": item.item_type,
            "start_time": item.start_time,
            "end_time": item.end_time,
            "location": None,
            "estimated_cost": None,
            "currency": "INR",
            "sort_order": item.sequence_order,
            "notes": item.notes,
        }

    def _serialize_trip(self, trip: Trip) -> Dict[str, Any]:
        days_serialized = []
        for d in (trip.days or []):
            days_serialized.append({
                "id": str(d.id),
                "trip_id": str(d.trip_id),
                "day_number": d.day_number,
                "date": str(d.date or ""),
                "title": d.title,
                "notes": d.notes,
                "items": [self._serialize_trip_item(item, trip_id=trip.id) for item in (d.items or [])],
            })

        return {
            "id": str(trip.id),
            "user_id": str(trip.user_id),
            "title": trip.title,
            "start_date": str(trip.start_date or ""),
            "end_date": str(trip.end_date or ""),
            "destination_district": trip.destination,
            "destination_state": "Karnataka",
            "budget_limit": None,
            "currency": "INR",
            "status": trip.status,
            "notes": trip.description,
            "days": days_serialized,
            "created_at": trip.created_at.isoformat() if trip.created_at else "",
            "updated_at": trip.updated_at.isoformat() if trip.updated_at else "",
        }
