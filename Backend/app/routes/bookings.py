from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date as DateType

from app.core.database import get_db
from app.services.booking_service import BookingService
from app.services.collaboration_service import CollaborationService
from app.schemas.booking import BookingCreate, BookingOut, BookingStatusUpdate, DateChangeCreate
from app.schemas.collaboration import CollaborationStatusUpdate
from app.dependencies.auth import get_current_user
from app.models.user import Login

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# CANONICAL STAY BOOKING ENDPOINTS (PREFIXED WITH /api)
# ─────────────────────────────────────────────────────────────

@router.post("/bookings", response_model=BookingOut)
def create_booking_new(
    data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    return BookingService.create_booking(db, data, current_user.id)

@router.get("/bookings", response_model=List[BookingOut])
def get_bookings_new(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    return BookingService.get_user_bookings(db, current_user.id, status)

@router.patch("/bookings/{id}")
def update_booking_status_new(
    id: int,
    data: BookingStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    return BookingService.update_booking_status(db, id, current_user.id, data)

@router.post("/bookings/{id}/date-change")
def request_booking_date_change(
    id: int,
    data: DateChangeCreate,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    return BookingService.request_date_change(db, id, current_user.id, data.new_date, data.message)

@router.post("/bookings/{id}/cancel")
def cancel_booking(
    id: int,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    return BookingService.cancel_booking(db, id, current_user.id)


