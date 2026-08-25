"""Booking Domain Service for Reservation Validation, Pricing, and Provider Lifecycle."""

import random
import string
from datetime import datetime, date
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.booking import Booking
from app.repositories.service import ServiceRepository
from app.repositories.booking import BookingRepository
from app.services.marketplace import MarketplaceService
from app.schemas.booking import (
    BookingCreateRequest,
    BookingResponse,
    BookingListResponse,
    ProviderBookingResponse,
    ProviderBookingListResponse,
)


class BookingService:
    """Domain service encapsulating reservation rules, pricing, access isolation, and provider management."""

    @classmethod
    def _generate_booking_code(cls) -> str:
        """Generate human-readable unique reference code (e.g. NC-BKG-8F2K4)."""
        chars = string.ascii_uppercase + string.digits
        random_suffix = "".join(random.choices(chars, k=5))
        return f"NC-BKG-{random_suffix}"

    @classmethod
    def _get_payment_status(cls, b: Booking) -> str:
        """Determine payment state from associated payments."""
        if hasattr(b, "payments") and b.payments:
            if any(p.status == "PAID" for p in b.payments):
                return "PAID"
            if any(p.status == "PROCESSING" for p in b.payments):
                return "PROCESSING"
        return "PAID" if b.status == "CONFIRMED" else "PENDING"

    @classmethod
    def _to_booking_response(cls, b: Booking) -> BookingResponse:
        """Serialize SQLAlchemy Booking model to Pydantic BookingResponse for customers."""
        service_title = b.service.title if b.service else "Agricultural Experience"
        service_location = b.service.location if b.service else "Karnataka"
        service_image = b.service.primary_image if b.service else "/images/services/fallback.jpg"
        provider_name = b.service.provider_name if b.service else "Verified Host"

        is_cancellable = b.status in ["PENDING", "CONFIRMED"]
        refund_amount = None
        refund_status = None
        refund_code = None

        if hasattr(b, "refunds") and b.refunds:
            latest_refund = sorted(b.refunds, key=lambda r: r.created_at or datetime.min, reverse=True)[0]
            refund_amount = latest_refund.amount
            refund_status = latest_refund.status
            refund_code = latest_refund.refund_code

        has_reviewed = bool(hasattr(b, "review") and b.review is not None)
        can_review = (b.status == "COMPLETED" and not has_reviewed)

        return BookingResponse(
            id=str(b.id),
            booking_code=b.booking_code,
            customer_id=str(b.customer_id),
            service_id=str(b.service_id),
            service_title=service_title,
            service_location=service_location,
            service_image=service_image,
            provider_name=provider_name,
            provider_phone="+91 98450 12345",
            start_date=b.start_date,
            end_date=b.end_date,
            time_slot_id=b.time_slot_id,
            time_slot_label=b.time_slot_label,
            guest_count=b.guest_count,
            status=b.status,
            payment_status=cls._get_payment_status(b),
            unit_price=b.unit_price,
            total_amount=b.total_amount,
            is_cancellable=is_cancellable,
            refund_amount=refund_amount,
            refund_status=refund_status,
            refund_code=refund_code,
            can_review=can_review,
            has_reviewed=has_reviewed,
            special_requests=b.special_requests,
            created_at=b.created_at,
        )

    @classmethod
    def _to_provider_booking_response(cls, b: Booking) -> ProviderBookingResponse:
        """Serialize SQLAlchemy Booking model to Pydantic ProviderBookingResponse for hosts."""
        service_title = b.service.title if b.service else "Agricultural Experience"
        customer_name = b.customer.full_name if b.customer else "Valued Traveler"
        customer_phone = b.customer.mobile if b.customer else "+91 98450 12345"
        customer_email = b.customer.email if b.customer else "guest@example.com"
        net_payout = round(b.total_amount * 0.95, 2)

        is_cancellable = b.status in ["PENDING", "CONFIRMED"]
        refund_amount = None
        refund_status = None
        refund_code = None

        if hasattr(b, "refunds") and b.refunds:
            latest_refund = sorted(b.refunds, key=lambda r: r.created_at or datetime.min, reverse=True)[0]
            refund_amount = latest_refund.amount
            refund_status = latest_refund.status
            refund_code = latest_refund.refund_code

        return ProviderBookingResponse(
            id=str(b.id),
            booking_code=b.booking_code,
            service_id=str(b.service_id),
            service_title=service_title,
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_email=customer_email,
            start_date=b.start_date,
            end_date=b.end_date,
            time_slot_label=b.time_slot_label,
            guest_count=b.guest_count,
            status=b.status,
            payment_status=cls._get_payment_status(b),
            unit_price=b.unit_price,
            total_amount=b.total_amount,
            net_payout=net_payout,
            is_cancellable=is_cancellable,
            refund_amount=refund_amount,
            refund_status=refund_status,
            refund_code=refund_code,
            special_requests=b.special_requests,
            created_at=b.created_at,
        )

    @classmethod
    def create_booking(
        cls,
        db: Session,
        current_user: User,
        req: BookingCreateRequest,
    ) -> BookingResponse:
        """Validate schedule, recheck live availability, compute price server-side, and create pending booking."""
        MarketplaceService.ensure_seeded(db)

        # 1. Fetch and validate published service
        service = ServiceRepository.get_by_id(db, req.service_id)
        if not service:
            service = ServiceRepository.get_by_slug(db, req.service_id)

        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Service with ID '{req.service_id}' does not exist.",
            )

        if service.status != "PUBLISHED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This service is not available for booking as it is not published.",
            )

        # 2. Date Format & Past Date Validation
        today_str = date.today().strftime("%Y-%m-%d")
        if req.start_date < today_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot book dates in the past. Please select an upcoming date.",
            )

        # Multi-night stay validation
        nights = 1
        if req.end_date:
            if req.end_date <= req.start_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Check-out date must be strictly after the check-in date.",
                )
            try:
                d1 = datetime.strptime(req.start_date, "%Y-%m-%d")
                d2 = datetime.strptime(req.end_date, "%Y-%m-%d")
                nights = max(1, (d2 - d1).days)
            except ValueError:
                nights = 1

        # 3. Server-side Availability & Capacity Re-check
        availability = MarketplaceService.get_service_availability(db, str(service.id))
        matching_day = next((d for d in availability.days if d.date == req.start_date), None)

        if not matching_day or not matching_day.is_available or matching_day.status in ["BLACKOUT", "UNAVAILABLE"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Selected date {req.start_date} is no longer available or is blocked for maintenance.",
            )

        # Time slot re-check
        slot_label = req.time_slot_label
        if availability.booking_model == "time_slot" and req.time_slot_id:
            matching_slot = next((s for s in matching_day.time_slots if s.id == req.time_slot_id), None)
            if not matching_slot or not matching_slot.is_available:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The selected time slot is full or no longer available. Please select another slot.",
                )
            if req.guest_count > matching_slot.remaining_capacity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Requested {req.guest_count} spots exceeds remaining capacity ({matching_slot.remaining_capacity}) for this slot.",
                )
            slot_label = f"{matching_slot.start_time} – {matching_slot.end_time}"

        # Overall capacity check
        max_allowed = matching_day.remaining_capacity or service.max_capacity or 10
        if req.guest_count > max_allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Guest count ({req.guest_count}) exceeds maximum available capacity ({max_allowed}).",
            )

        # 4. Authoritative Server-side Price Calculation
        unit_price = float(service.price)
        category_slug = (service.category_slug or "").lower()

        if category_slug == "stay":
            total_amount = unit_price * nights
        elif service.unit == "person":
            total_amount = unit_price * req.guest_count
        else:
            total_amount = unit_price

        # 5. Create Booking in PENDING state
        booking_code = cls._generate_booking_code()
        booking = BookingRepository.create(
            db,
            booking_code=booking_code,
            customer_id=current_user.id,
            service_id=service.id,
            provider_id=service.provider_id,
            start_date=req.start_date,
            end_date=req.end_date,
            time_slot_id=req.time_slot_id,
            time_slot_label=slot_label,
            guest_count=req.guest_count,
            status="PENDING",
            unit_price=unit_price,
            total_amount=total_amount,
            special_requests=req.special_requests,
        )

        return cls._to_booking_response(booking)

    @classmethod
    def get_customer_bookings(
        cls,
        db: Session,
        customer_id: str,
    ) -> BookingListResponse:
        """Retrieve all bookings created by the authenticated customer."""
        bookings = BookingRepository.list_by_customer(db, customer_id)
        serialized = [cls._to_booking_response(b) for b in bookings]
        return BookingListResponse(
            bookings=serialized,
            total=len(serialized),
        )

    @classmethod
    def get_booking_detail(
        cls,
        db: Session,
        customer_id: str,
        booking_id: str,
    ) -> BookingResponse:
        """Fetch a single booking with customer ownership validation."""
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            booking = BookingRepository.get_by_code(db, booking_id)

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking with ID or code '{booking_id}' was not found.",
            )

        # Enforce customer isolation
        if str(booking.customer_id) != customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this booking.",
            )

        return cls._to_booking_response(booking)

    @classmethod
    def cancel_booking(
        cls,
        db: Session,
        customer_id: str,
        booking_id: str,
    ) -> BookingResponse:
        """Allow customer to cancel a pending or confirmed booking."""
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            booking = BookingRepository.get_by_code(db, booking_id)

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking with ID or code '{booking_id}' was not found.",
            )

        if str(booking.customer_id) != customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to cancel this booking.",
            )

        if booking.status == "CANCELLED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This booking has already been cancelled.",
            )

        if booking.status == "COMPLETED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Completed bookings cannot be cancelled.",
            )

        if booking.status not in ["PENDING", "CONFIRMED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel booking with current status '{booking.status}'.",
            )

        updated_booking = BookingRepository.update_status(db, str(booking.id), "CANCELLED")

        # Authoritative refund processing & reconciliation
        from app.services.refund import RefundService
        RefundService.process_cancellation_refund(db, updated_booking)
        db.refresh(updated_booking)

        return cls._to_booking_response(updated_booking)

    # ─────────────────────────────────────────────────────────────
    # Provider Booking Management Logic
    # ─────────────────────────────────────────────────────────────

    @classmethod
    def get_provider_bookings(
        cls,
        db: Session,
        provider_user: User,
    ) -> ProviderBookingListResponse:
        """Fetch all bookings associated with services hosted by the authenticated provider."""
        bookings = BookingRepository.list_by_provider(db, str(provider_user.id))
        serialized = [cls._to_provider_booking_response(b) for b in bookings]
        return ProviderBookingListResponse(
            bookings=serialized,
            total=len(serialized),
        )

    @classmethod
    def get_provider_booking_detail(
        cls,
        db: Session,
        provider_user: User,
        booking_id: str,
    ) -> ProviderBookingResponse:
        """Fetch a single booking with provider ownership validation."""
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            booking = BookingRepository.get_by_code(db, booking_id)

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking with ID or code '{booking_id}' was not found.",
            )

        # Enforce provider ownership
        is_owner = (
            str(booking.provider_id) == str(provider_user.id)
            or (booking.service and str(booking.service.provider_id) == str(provider_user.id))
        )
        if not is_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access this guest reservation.",
            )

        return cls._to_provider_booking_response(booking)

    @classmethod
    def update_provider_booking_status(
        cls,
        db: Session,
        provider_user: User,
        booking_id: str,
        new_status: str,
    ) -> ProviderBookingResponse:
        """Transition booking status with provider authorization and state machine validation."""
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            booking = BookingRepository.get_by_code(db, booking_id)

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking with ID or code '{booking_id}' was not found.",
            )

        is_owner = (
            str(booking.provider_id) == str(provider_user.id)
            or (booking.service and str(booking.service.provider_id) == str(provider_user.id))
        )
        if not is_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to modify this guest reservation.",
            )

        target_status = new_status.upper()
        if target_status not in ["CONFIRMED", "CANCELLED", "COMPLETED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid target status '{new_status}'. Allowed: CONFIRMED, CANCELLED, COMPLETED.",
            )

        # State Machine Transitions
        current = booking.status
        if current in ["CANCELLED", "COMPLETED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot modify a reservation that is already {current}.",
            )

        if current == "PENDING" and target_status not in ["CONFIRMED", "CANCELLED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pending reservations can only be Accepted (CONFIRMED) or Rejected (CANCELLED).",
            )

        if current == "CONFIRMED" and target_status not in ["COMPLETED", "CANCELLED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Confirmed reservations can only be Completed (COMPLETED) or Cancelled (CANCELLED).",
            )

        updated_booking = BookingRepository.update_status(db, str(booking.id), target_status)
        return cls._to_provider_booking_response(updated_booking)
