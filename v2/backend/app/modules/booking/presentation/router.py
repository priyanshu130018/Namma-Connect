"""Booking presentation router."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.modules.user.domain.models import User
from app.modules.booking.infrastructure.repository import BookingRepository
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.booking.application.service import BookingService
from app.modules.booking.presentation.schemas import (
    BookingCreateRequest,
    BookingStatusUpdateRequest,
    BookingCancelRequest,
    BookingResponse,
)

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def get_booking_service(db: Session = Depends(get_db)) -> BookingService:
    booking_repo = BookingRepository(db)
    marketplace_repo = MarketplaceRepository(db)
    return BookingService(booking_repo, marketplace_repo)


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreateRequest,
    current_user: User = Depends(get_current_active_user),
    service: BookingService = Depends(get_booking_service),
):
    """Create a new reservation for a service."""
    return service.create_booking(user=current_user, payload=payload)


@router.get("", response_model=dict)
def list_user_bookings(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    service: BookingService = Depends(get_booking_service),
):
    """List bookings for the logged-in customer."""
    return service.list_user_bookings(user_id=current_user.id, status=status, page=page, page_size=page_size)


@router.get("/provider/queue", response_model=dict)
def list_provider_queue(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    service: BookingService = Depends(get_booking_service),
):
    """List incoming reservations for the host's services."""
    return service.list_provider_bookings(provider_id=current_user.id, status=status, page=page, page_size=page_size)


@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(
    booking_id: str,
    current_user: User = Depends(get_current_active_user),
    service: BookingService = Depends(get_booking_service),
):
    """Get single booking details."""
    return service.get_booking_by_id(user=current_user, booking_id=booking_id)


@router.patch("/{booking_id}/status", response_model=BookingResponse)
def update_booking_status(
    booking_id: str,
    payload: BookingStatusUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    service: BookingService = Depends(get_booking_service),
):
    """Update booking status (Host/Admin)."""
    return service.update_booking_status(user=current_user, booking_id=booking_id, new_status=payload.status, reason=payload.reason)


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(
    booking_id: str,
    payload: BookingCancelRequest,
    current_user: User = Depends(get_current_active_user),
    service: BookingService = Depends(get_booking_service),
):
    """Cancel a booking."""
    return service.cancel_booking(user=current_user, booking_id=booking_id, reason=payload.reason)
