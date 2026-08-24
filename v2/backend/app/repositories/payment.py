"""Payment Repository for Transaction SQL Operations."""

from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from app.models.payment import Payment


class PaymentRepository:
    """Encapsulates SQL operations for Payment records."""

    @staticmethod
    def create(db: Session, **kwargs) -> Payment:
        """Create a new payment record in the database."""
        payment = Payment(**kwargs)
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return payment

    @staticmethod
    def get_by_id(db: Session, payment_id: str) -> Optional[Payment]:
        """Fetch payment by primary key ID."""
        try:
            return (
                db.query(Payment)
                .options(joinedload(Payment.booking), joinedload(Payment.customer))
                .filter(Payment.id == payment_id)
                .first()
            )
        except Exception:
            return None

    @staticmethod
    def get_by_order_id(db: Session, razorpay_order_id: str) -> Optional[Payment]:
        """Fetch payment by Razorpay order ID."""
        return (
            db.query(Payment)
            .options(joinedload(Payment.booking), joinedload(Payment.customer))
            .filter(Payment.razorpay_order_id == razorpay_order_id)
            .first()
        )

    @staticmethod
    def get_by_booking_id(db: Session, booking_id: str) -> Optional[Payment]:
        """Fetch newest payment record for a given booking."""
        try:
            return (
                db.query(Payment)
                .options(joinedload(Payment.booking))
                .filter(Payment.booking_id == booking_id)
                .order_by(desc(Payment.created_at))
                .first()
            )
        except Exception:
            return None

    @staticmethod
    def update_verified(
        db: Session,
        payment: Payment,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> Payment:
        """Mark payment as PAID with verified gateway signature."""
        payment.status = "PAID"
        payment.razorpay_payment_id = razorpay_payment_id
        payment.razorpay_signature = razorpay_signature
        db.commit()
        db.refresh(payment)
        return payment
