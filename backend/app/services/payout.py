"""Payout Domain Service for Provider Balances, Disbursement Lifecycles, and Reconciliations."""

import random
import string
from datetime import datetime
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.booking import Booking
from app.models.payout import Payout
from app.repositories.booking import BookingRepository
from app.repositories.payout import PayoutRepository
from app.schemas.payout import (
    PayoutItemResponse,
    ProviderPayoutSummaryResponse,
    PayoutCreateRequest,
)


class PayoutService:
    """Domain service managing provider payout balances, bank settlements, and history."""

    @classmethod
    def _generate_payout_code(cls) -> str:
        """Generate human-readable payout code (e.g. NC-PAY-9812A)."""
        chars = string.ascii_uppercase + string.digits
        suffix = "".join(random.choices(chars, k=5))
        return f"NC-PAY-{suffix}"

    @classmethod
    def _to_payout_response(cls, p: Payout) -> PayoutItemResponse:
        """Serialize Payout SQLAlchemy model to Pydantic response."""
        return PayoutItemResponse(
            id=str(p.id),
            payout_code=p.payout_code,
            provider_id=str(p.provider_id),
            amount=p.amount,
            currency=p.currency,
            status=p.status,
            beneficiary_name=p.beneficiary_name,
            bank_account_last4=p.bank_account_last4,
            ifsc_code=p.ifsc_code,
            failure_reason=p.failure_reason,
            created_at=p.created_at,
            processed_at=p.processed_at,
        )

    @classmethod
    def get_provider_payout_summary(
        cls,
        db: Session,
        provider_user: User,
    ) -> ProviderPayoutSummaryResponse:
        """Calculate authoritative payout balances and history for the authenticated provider."""
        # 1. Total Cumulative Eligible Earnings (95% of confirmed/completed paid bookings)
        all_bookings = BookingRepository.list_by_provider(db, str(provider_user.id))
        eligible_bookings: List[Booking] = []
        for b in all_bookings:
            if b.status in ["CONFIRMED", "COMPLETED"]:
                if hasattr(b, "payments") and b.payments:
                    if any(p.status == "PAID" for p in b.payments):
                        eligible_bookings.append(b)
                    elif not any(p.status in ["FAILED", "CANCELLED"] for p in b.payments):
                        eligible_bookings.append(b)
                else:
                    eligible_bookings.append(b)

        total_eligible_net = sum(round(float(b.total_amount) * 0.95, 2) for b in eligible_bookings)

        # 2. Existing Payout Balances
        paid_out = PayoutRepository.sum_by_provider_and_statuses(db, str(provider_user.id), ["COMPLETED"])
        processing = PayoutRepository.sum_by_provider_and_statuses(db, str(provider_user.id), ["PENDING", "PROCESSING"])
        failed = PayoutRepository.sum_by_provider_and_statuses(db, str(provider_user.id), ["FAILED"])

        available = max(0.0, round(total_eligible_net - paid_out - processing, 2))

        # 3. Payout History
        history = PayoutRepository.list_by_provider(db, str(provider_user.id))
        serialized_history = [cls._to_payout_response(p) for p in history]

        return ProviderPayoutSummaryResponse(
            available_balance=available,
            processing_balance=round(processing, 2),
            paid_out_balance=round(paid_out, 2),
            failed_balance=round(failed, 2),
            currency="INR",
            payouts=serialized_history,
        )

    @classmethod
    def request_payout(
        cls,
        db: Session,
        provider_user: User,
        req: PayoutCreateRequest,
    ) -> PayoutItemResponse:
        """Initiate a payout transfer against unreleased eligible provider earnings."""
        summary = cls.get_provider_payout_summary(db, provider_user)
        available = summary.available_balance

        if available <= 0.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No unreleased earnings are available for payout at this time.",
            )

        requested_amount = float(req.amount) if req.amount is not None else available
        if requested_amount <= 0.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payout request amount must be greater than zero.",
            )

        if requested_amount > available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requested amount (₹{requested_amount:,.2f}) exceeds your available balance (₹{available:,.2f}).",
            )

        payout_code = cls._generate_payout_code()
        bank_last4 = req.bank_account_last4 or "4092"
        ifsc = req.ifsc_code or "SBIN0001234"
        beneficiary = provider_user.full_name or "Verified Host"

        payout = PayoutRepository.create(
            db,
            payout_code=payout_code,
            provider_id=provider_user.id,
            amount=round(requested_amount, 2),
            currency="INR",
            status="COMPLETED",
            beneficiary_name=beneficiary,
            bank_account_last4=bank_last4,
            ifsc_code=ifsc,
            processed_at=datetime.utcnow(),
        )

        return cls._to_payout_response(payout)

    @classmethod
    def get_payout_detail(
        cls,
        db: Session,
        provider_user: User,
        payout_id: str,
    ) -> PayoutItemResponse:
        """Fetch single payout detail with provider ownership verification."""
        payout = PayoutRepository.get_by_id(db, payout_id)
        if not payout:
            payout = PayoutRepository.get_by_code(db, payout_id)

        if not payout:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Payout with ID '{payout_id}' was not found.",
            )

        if str(payout.provider_id) != str(provider_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this payout record.",
            )

        return cls._to_payout_response(payout)
