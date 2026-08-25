"""Provider Earnings endpoints for revenue analytics and reporting."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_partner
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.earnings import ProviderEarningsResponse
from app.services.earnings import EarningsService

router = APIRouter(prefix="/earnings", tags=["Earnings"])


@router.get("/partner", response_model=APIResponse[ProviderEarningsResponse])
def get_provider_earnings(
    period: str = Query("30d", description="Time interval: 7d, 30d, or 1y"),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Retrieve authoritative earnings summary and time-series for the authenticated provider."""
    earnings = EarningsService.get_provider_earnings(db, current_user, period=period)
    return APIResponse(
        success=True,
        message=f"Provider earnings for period '{earnings.period}' retrieved successfully",
        data=earnings,
    )
