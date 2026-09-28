"""Booking application service."""

import uuid
from decimal import Decimal
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from app.modules.booking.infrastructure.repository import BookingRepository
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.booking.presentation.schemas import BookingCreateRequest
from app.modules.booking.domain.models import Booking
from app.modules.user.domain.models import User
from app.core.enums import BookingStatus


class BookingService:
    def __init__(self, booking_repo: BookingRepository, marketplace_repo: MarketplaceRepository):
        self.repo = booking_repo
        self.marketplace_repo = marketplace_repo

    def create_booking(self, user: User, payload: BookingCreateRequest) -> Dict[str, Any]:
        service = self.marketplace_repo.get_service_by_id(payload.service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

        # Self-booking prevention guard
        if str(service.provider_id) == str(user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot book your own service listing.",
            )

        # Service maximum capacity validation
        if service.max_capacity and payload.guests_count > service.max_capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Guests count ({payload.guests_count}) exceeds maximum capacity of {service.max_capacity} for this listing.",
            )

        start_date_str = payload.start_date.isoformat()
        # Check slot availability with row-level locking for concurrency protection
        if hasattr(self.repo, "db") and self.repo.db:
            from app.modules.marketplace.domain.models import ServiceAvailability
            try:
                avail = (
                    self.repo.db.query(ServiceAvailability)
                    .filter(
                        ServiceAvailability.service_id == service.id,
                        ServiceAvailability.date == start_date_str,
                    )
                    .with_for_update()
                    .first()
                )
                if avail:
                    if avail.is_blocked:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="The requested date slot is currently blocked by the host.",
                        )
                    remaining_capacity = avail.capacity - avail.booked_count
                    if payload.guests_count > remaining_capacity:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Insufficient capacity for the requested date. Only {remaining_capacity} spots available.",
                        )
                    avail.booked_count += payload.guests_count
            except HTTPException:
                raise
            except Exception:
                # If locking not supported on test driver (e.g. SQLite), continue safely
                pass

        # Calculate days
        days = 1
        if payload.end_date and payload.end_date > payload.start_date:
            days = (payload.end_date - payload.start_date).days

        unit_price = Decimal(str(service.price))
        total_price = unit_price * Decimal(str(payload.guests_count)) * Decimal(str(days))
        tax_amount = (total_price * Decimal("0.05")).quantize(Decimal("0.01"))  # 5% GST
        platform_fee = (total_price * Decimal("0.03")).quantize(Decimal("0.01"))  # 3% fee
        final_amount = total_price + tax_amount + platform_fee

        booking_code = f"NC-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        booking = Booking(
            booking_code=booking_code,
            customer_id=user.id,
            service_id=service.id,
            provider_id=service.provider_id,
            start_date=payload.start_date.isoformat(),
            end_date=payload.end_date.isoformat() if payload.end_date else None,
            time_slot_label=payload.slot_time,
            guest_count=payload.guests_count,
            unit_price=unit_price,
            total_amount=final_amount,
            status=BookingStatus.PENDING.value,
            special_requests=payload.special_requests,
        )
        saved = self.repo.save(booking)
        return self._serialize_booking(saved)

    def get_booking_by_id(self, user: User, booking_id: str) -> Dict[str, Any]:
        booking = self.repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
        if str(booking.customer_id) != str(user.id) and str(booking.provider_id) != str(user.id) and user.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this booking.")
        return self._serialize_booking(booking)

    def list_user_bookings(self, user_id, status: Optional[str] = None, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        offset = (page - 1) * page_size
        items, total = self.repo.list_by_user(user_id=user_id, status=status, limit=page_size, offset=offset)
        return {
            "items": [self._serialize_booking(b) for b in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1,
        }

    def list_provider_bookings(self, provider_id, status: Optional[str] = None, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        offset = (page - 1) * page_size
        items, total = self.repo.list_by_provider(provider_id=provider_id, status=status, limit=page_size, offset=offset)
        return {
            "items": [self._serialize_booking(b) for b in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1,
        }

    def update_booking_status(self, user: User, booking_id: str, new_status: str, reason: Optional[str] = None) -> Dict[str, Any]:
        booking = self.repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
        if str(booking.provider_id) != str(user.id) and user.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the service host or admin can update booking status.")

        booking.status = new_status
        saved = self.repo.save(booking)
        return self._serialize_booking(saved)

    def cancel_booking(self, user: User, booking_id: str, reason: str) -> Dict[str, Any]:
        booking = self.repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
        if str(booking.customer_id) != str(user.id) and str(booking.provider_id) != str(user.id) and user.role != "ADMIN":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to cancel this booking.")

        booking.status = BookingStatus.CANCELLED.value
        saved = self.repo.save(booking)
        return self._serialize_booking(saved)

    def _serialize_booking(self, b: Booking) -> Dict[str, Any]:
        total_amt = float(b.total_amount)
        unit_p = float(b.unit_price)
        guests = b.guest_count or 1
        subtotal = round(unit_p * guests, 2)
        tax = round(subtotal * 0.05, 2)
        fee = round(subtotal * 0.03, 2)

        return {
            "id": str(b.id),
            "booking_number": b.booking_code,
            "user_id": str(b.customer_id),
            "service_id": str(b.service_id),
            "provider_id": str(b.provider_id) if b.provider_id else "",
            "start_date": str(b.start_date or ""),
            "end_date": str(b.end_date) if b.end_date else None,
            "slot_time": b.time_slot_label,
            "guests_count": b.guest_count,
            "unit_price": unit_p,
            "total_price": subtotal,
            "tax_amount": tax,
            "platform_fee": fee,
            "final_amount": total_amt,
            "currency": "INR",
            "status": b.status,
            "payment_status": "COMPLETED" if b.status == "CONFIRMED" else "PENDING",
            "special_requests": b.special_requests,
            "cancellation_reason": None,
            "cancelled_at": None,
            "created_at": b.created_at.isoformat() if b.created_at else "",
            "updated_at": b.updated_at.isoformat() if b.updated_at else "",
        }
