"""Bookings endpoints for Customer Reservations and Provider Management."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_partner
from app.models.user import User
from app.schemas.common import APIResponse, MessageResponse
from app.schemas.booking import (
    BookingCreateRequest,
    BookingResponse,
    BookingListResponse,
    ProviderBookingResponse,
    ProviderBookingListResponse,
    ProviderBookingStatusUpdateRequest,
)
from app.services.booking import BookingService

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.get("", response_model=MessageResponse)
def list_bookings():
    """Bookings router status gateway."""
    return MessageResponse(
        success=True,
        message="Bookings management endpoint operational",
        data={"status": "ready"},
    )


# ─────────────────────────────────────────────────────────────────
# Customer Endpoints
# ─────────────────────────────────────────────────────────────────

@router.post("", response_model=APIResponse[BookingResponse], status_code=status.HTTP_201_CREATED)
def create_booking(
    req: BookingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new reservation request after validating live availability and capacity."""
    booking = BookingService.create_booking(db, current_user, req)
    return APIResponse(
        success=True,
        message="Booking request successfully created and queued in pending state.",
        data=booking,
    )


@router.get("/me", response_model=APIResponse[BookingListResponse])
def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all reservations created by the current authenticated customer."""
    bookings = BookingService.get_customer_bookings(db, str(current_user.id))
    return APIResponse(
        success=True,
        message="Customer bookings retrieved successfully",
        data=bookings,
    )


@router.get("/partner", response_model=APIResponse[ProviderBookingListResponse])
def get_provider_bookings(
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve all guest reservations for services hosted by the authenticated provider."""
    bookings = BookingService.get_provider_bookings(db, current_user)
    return APIResponse(
        success=True,
        message="Provider guest reservations retrieved successfully",
        data=bookings,
    )


@router.get("/partner/{booking_id}", response_model=APIResponse[ProviderBookingResponse])
def get_provider_booking_detail(
    booking_id: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve single guest reservation manifest with provider ownership verification."""
    booking = BookingService.get_provider_booking_detail(db, current_user, booking_id)
    return APIResponse(
        success=True,
        message="Provider reservation manifest retrieved successfully",
        data=booking,
    )


@router.post("/partner/{booking_id}/status", response_model=APIResponse[ProviderBookingResponse])
def update_provider_booking_status(
    booking_id: str,
    req: ProviderBookingStatusUpdateRequest,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Update guest reservation status (Accept, Complete, Reject/Cancel)."""
    updated = BookingService.update_provider_booking_status(db, current_user, booking_id, req.status)
    return APIResponse(
        success=True,
        message=f"Reservation status successfully updated to {req.status.upper()}.",
        data=updated,
    )


@router.get("/{booking_id}", response_model=APIResponse[BookingResponse])
def get_booking_detail(
    booking_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a single reservation detail with customer ownership verification."""
    booking = BookingService.get_booking_detail(db, str(current_user.id), booking_id)
    return APIResponse(
        success=True,
        message="Booking details retrieved successfully",
        data=booking,
    )


@router.post("/{booking_id}/cancel", response_model=APIResponse[BookingResponse])
def cancel_booking(
    booking_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a customer reservation (only valid for PENDING or CONFIRMED bookings)."""
    booking = BookingService.cancel_booking(db, str(current_user.id), booking_id)
    return APIResponse(
        success=True,
        message="Booking reservation successfully cancelled.",
        data=booking,
    )
