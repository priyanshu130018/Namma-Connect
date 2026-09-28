"""Payment repository handling payment, refund, and payout entities."""

import uuid
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.modules.payment.domain.models import Payment, Refund, Payout


class PaymentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_payment_by_id(self, payment_id) -> Optional[Payment]:
        if isinstance(payment_id, str):
            try:
                payment_id = uuid.UUID(payment_id)
            except ValueError:
                return None
        return self.db.query(Payment).filter(Payment.id == payment_id).first()

    def get_payment_by_gateway_order_id(self, order_id: str) -> Optional[Payment]:
        return self.db.query(Payment).filter(Payment.razorpay_order_id == order_id).first()

    def get_payment_by_booking_id(self, booking_id) -> Optional[Payment]:
        if isinstance(booking_id, str):
            booking_id = uuid.UUID(booking_id)
        return self.db.query(Payment).filter(Payment.booking_id == booking_id).order_by(desc(Payment.created_at)).first()

    def save_payment(self, payment: Payment) -> Payment:
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def save_refund(self, refund: Refund) -> Refund:
        self.db.add(refund)
        self.db.commit()
        self.db.refresh(refund)
        return refund

    def get_refund_by_id(self, refund_id) -> Optional[Refund]:
        if isinstance(refund_id, str):
            try:
                refund_id = uuid.UUID(refund_id)
            except ValueError:
                return None
        return self.db.query(Refund).filter(Refund.id == refund_id).first()

    def save_payout(self, payout: Payout) -> Payout:
        self.db.add(payout)
        self.db.commit()
        self.db.refresh(payout)
        return payout

    def list_payouts_by_provider(self, provider_id, limit: int = 20, offset: int = 0) -> Tuple[List[Payout], int]:
        if isinstance(provider_id, str):
            provider_id = uuid.UUID(provider_id)
        q = self.db.query(Payout).filter(Payout.provider_id == provider_id)
        total = q.count()
        items = q.order_by(desc(Payout.created_at)).offset(offset).limit(limit).all()
        return items, total

    def list_all_payments(self, limit: int = 20, offset: int = 0) -> Tuple[List[Payment], int]:
        q = self.db.query(Payment)
        total = q.count()
        items = q.order_by(desc(Payment.created_at)).offset(offset).limit(limit).all()
        return items, total

    def list_all_payouts(self, limit: int = 20, offset: int = 0) -> Tuple[List[Payout], int]:
        q = self.db.query(Payout)
        total = q.count()
        items = q.order_by(desc(Payout.created_at)).offset(offset).limit(limit).all()
        return items, total
