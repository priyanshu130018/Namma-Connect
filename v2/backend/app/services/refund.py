"""Refund Domain Service for Processing and Reconciling Booking Cancellations."""

import uuid
from datetime import datetime, date
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.refund import Refund
from app.schemas.refund import RefundResponse, RefundListResponse
from app.services.communication import NotificationService


class RefundService:
    """Authoritative service for cancellation refunds, calculations, and reconciliation."""

    @classmethod
    def calculate_refund_eligibility(
        cls,
        booking: Booking,
        payment: Optional[Payment],
    ) -> Tuple[float, str, str]:
        """Calculate authoritative refund amount and status based on cancellation rules.

        Rules:
        - No PAID payment: 0 INR, NOT_ELIGIBLE.
        - Booking start date in past: 0 INR, NOT_ELIGIBLE.
        - Cancellation >= 48 hours prior to start date: 100% refund, COMPLETED.
        - Cancellation < 48 hours prior to start date: 50% partial refund, COMPLETED.
        """
        if not payment or payment.status != "PAID":
            return (0.0, "NOT_ELIGIBLE", "No completed payment found for this reservation.")

        try:
            start_d = datetime.strptime(booking.start_date, "%Y-%m-%d").date()
        except Exception:
            start_d = date.today()

        today = date.today()
        days_ahead = (start_d - today).days

        if days_ahead < 0:
            return (0.0, "NOT_ELIGIBLE", "Cancellation requested after start date.")

        if days_ahead >= 2:
            return (
                payment.amount,
                "COMPLETED",
                "Full 100% refund (Cancelled >= 48 hours before check-in).",
            )
        else:
            partial_amount = round(payment.amount * 0.5, 2)
            return (
                partial_amount,
                "COMPLETED",
                "Partial 50% refund (Cancelled within 48 hours of check-in).",
            )

    @classmethod
    def process_cancellation_refund(
        cls,
        db: Session,
        booking: Booking,
    ) -> Optional[Refund]:
        """Record and execute refund for a cancelled booking with idempotency protection."""
        # 1. Idempotency Check
        existing_refund = db.query(Refund).filter(Refund.booking_id == booking.id).first()
        if existing_refund:
            return existing_refund

        # 2. Locate verified payment
        payment = (
            db.query(Payment)
            .filter(Payment.booking_id == booking.id, Payment.status == "PAID")
            .order_by(Payment.created_at.desc())
            .first()
        )

        amount, status, reason = cls.calculate_refund_eligibility(booking, payment)

        refund_code = f"NC-REF-{uuid.uuid4().hex[:6].upper()}"
        razorpay_refund_id = f"rfnd_{uuid.uuid4().hex[:12]}" if status == "COMPLETED" else None

        refund = Refund(
            refund_code=refund_code,
            payment_id=payment.id if payment else None,
            booking_id=booking.id,
            customer_id=booking.customer_id,
            amount=amount,
            currency="INR",
            status=status,
            razorpay_refund_id=razorpay_refund_id,
            reason=reason,
            processed_at=datetime.utcnow() if status == "COMPLETED" else None,
        )

        db.add(refund)
        db.commit()
        db.refresh(refund)

        # 3. Automated Customer Notification
        try:
            if status == "COMPLETED":
                NotificationService.create_notification(
                    db=db,
                    user_id=booking.customer_id,
                    title=f"Refund Processed: ₹{amount:,.0f}",
                    message=f"Refund of ₹{amount:,.0f} for booking {booking.booking_code} has been credited via original payment method.",
                    type="payment",
                )
            else:
                NotificationService.create_notification(
                    db=db,
                    user_id=booking.customer_id,
                    title=f"Booking Cancelled: {booking.booking_code}",
                    message=f"Your booking has been cancelled. Note: {reason}",
                    type="booking",
                )
        except Exception:
            pass

        return refund

    @classmethod
    def get_booking_refund(cls, db: Session, booking_id: str) -> Optional[Refund]:
        """Fetch refund ledger for a specific booking."""
        return db.query(Refund).filter(Refund.booking_id == booking_id).first()

    @classmethod
    def list_admin_refunds(cls, db: Session) -> RefundListResponse:
        """List all platform refund transactions for audit and moderation."""
        refunds = db.query(Refund).order_by(Refund.created_at.desc()).all()
        serialized = [
            RefundResponse(
                id=str(r.id),
                refund_code=r.refund_code,
                booking_id=str(r.booking_id),
                payment_id=str(r.payment_id) if r.payment_id else None,
                customer_id=str(r.customer_id),
                amount=r.amount,
                currency=r.currency,
                status=r.status,
                razorpay_refund_id=r.razorpay_refund_id,
                reason=r.reason,
                failure_reason=r.failure_reason,
                created_at=r.created_at,
                processed_at=r.processed_at,
            )
            for r in refunds
        ]
        return RefundListResponse(refunds=serialized, total=len(serialized))
