"""Analytics presentation router."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.modules.user.domain.models import User
from app.modules.analytics.infrastructure.repository import AnalyticsRepository
from app.modules.analytics.application.service import AnalyticsService
from app.modules.analytics.presentation.schemas import ProviderAnalyticsSummaryResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def get_analytics_service(db: Session = Depends(get_db)) -> AnalyticsService:
    repo = AnalyticsRepository(db)
    return AnalyticsService(repo)


@router.get("/provider/summary", response_model=ProviderAnalyticsSummaryResponse)
def get_provider_analytics_summary(
    current_user: User = Depends(get_current_active_user),
    service: AnalyticsService = Depends(get_analytics_service),
):
    """Retrieve provider performance metrics, NC score, and action suggestions."""
    return service.get_provider_summary(provider=current_user)
