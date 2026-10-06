"""Trip presentation router."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.modules.user.domain.models import User
from app.modules.trip.infrastructure.repository import TripRepository
from app.modules.trip.application.service import TripService
from app.modules.trip.presentation.schemas import (
    TripCreateRequest,
    TripItemCreateRequest,
    TripResponse,
    TripItemResponse,
)

router = APIRouter(prefix="/trips", tags=["Trips"])


def get_trip_service(db: Session = Depends(get_db)) -> TripService:
    repo = TripRepository(db)
    return TripService(repo)


@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(
    payload: TripCreateRequest,
    current_user: User = Depends(get_current_active_user),
    service: TripService = Depends(get_trip_service),
):
    """Create a new itinerary/trip planning instance."""
    return service.create_trip(user=current_user, payload=payload)


@router.get("", response_model=dict)
def list_user_trips(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    service: TripService = Depends(get_trip_service),
):
    """List trips for the authenticated user."""
    return service.list_trips(user=current_user, page=page, page_size=page_size)


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: str,
    current_user: User = Depends(get_current_active_user),
    service: TripService = Depends(get_trip_service),
):
    """Get full trip itinerary with days and items."""
    return service.get_trip(user=current_user, trip_id=trip_id)


@router.post("/{trip_id}/items", response_model=TripItemResponse, status_code=status.HTTP_201_CREATED)
def add_trip_item(
    trip_id: str,
    payload: TripItemCreateRequest,
    current_user: User = Depends(get_current_active_user),
    service: TripService = Depends(get_trip_service),
):
    """Add an item/activity to a trip."""
    return service.add_trip_item(user=current_user, trip_id=trip_id, payload=payload)


@router.delete("/{trip_id}/items/{item_id}", response_model=dict)
def delete_trip_item(
    trip_id: str,
    item_id: str,
    current_user: User = Depends(get_current_active_user),
    service: TripService = Depends(get_trip_service),
):
    """Remove an item from a trip."""
    return service.delete_trip_item(user=current_user, trip_id=trip_id, item_id=item_id)


@router.delete("/{trip_id}", response_model=dict)
def delete_trip(
    trip_id: str,
    current_user: User = Depends(get_current_active_user),
    service: TripService = Depends(get_trip_service),
):
    """Delete a trip."""
    return service.delete_trip(user=current_user, trip_id=trip_id)
