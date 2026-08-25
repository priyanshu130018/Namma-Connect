"""Provider Payout endpoints for bank disbursements, history, and status checks."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_partner
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.payout import (
    PayoutItemResponse,
    ProviderPayoutSummaryResponse,
    PayoutCreateRequest,
)
from app.services.payout import PayoutService

router = APIRouter(prefix="/payouts", tags=["Payouts"])


@router.get("/partner", response_model=APIResponse[ProviderPayoutSummaryResponse])
def get_provider_payout_summary(
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve payout balances (available, processing, paid, failed) and history for the authenticated provider."""
    summary = PayoutService.get_provider_payout_summary(db, current_user)
    return APIResponse(
        success=True,
        message="Provider payout summary retrieved successfully",
        data=summary,
    )


@router.post("/request", response_model=APIResponse[PayoutItemResponse], status_code=status.HTTP_201_CREATED)
def request_payout(
    req: PayoutCreateRequest,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Initiate a payout transfer against unreleased eligible provider earnings."""
    payout = PayoutService.request_payout(db, current_user, req)
    return APIResponse(
        success=True,
        message="Payout request successfully processed and queued for bank settlement.",
        data=payout,
    )


@router.get("/{payout_id}", response_model=APIResponse[PayoutItemResponse])
def get_payout_detail(
    payout_id: str,
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve single payout disbursement record with provider ownership verification."""
    payout = PayoutService.get_payout_detail(db, current_user, payout_id)
    return APIResponse(
        success=True,
        message="Payout record retrieved successfully",
        data=payout,
    )
