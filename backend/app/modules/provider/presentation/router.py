"""Provider presentation router mounting /api/v2/providers and /api/v2/partner-applications."""

from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.modules.provider.infrastructure.repository import ProviderRepository
from app.modules.provider.application.service import ProviderService
from app.modules.provider.presentation.schemas import (
    PartnerApplicationCreate,
    PartnerApplicationResponse,
    ProviderDashboardStats,
)
from app.schemas.common import APIResponse

router = APIRouter(prefix="/providers", tags=["Providers"])
partner_apps_router = APIRouter(prefix="/partner-applications", tags=["Partner Applications"])


def get_provider_service(db: Session = Depends(get_db)) -> ProviderService:
    return ProviderService(ProviderRepository(db))


@router.post("/apply", response_model=APIResponse[PartnerApplicationResponse], status_code=status.HTTP_201_CREATED)
@partner_apps_router.post("", response_model=APIResponse[PartnerApplicationResponse], status_code=status.HTTP_201_CREATED)
def submit_partner_application(
    payload: PartnerApplicationCreate,
    current_user: User = Depends(get_current_user),
    provider_service: ProviderService = Depends(get_provider_service),
):
    """Submit a host KYC verification application."""
    data = provider_service.submit_application(current_user, payload)
    return APIResponse(success=True, message="Application submitted successfully", data=data)



@partner_apps_router.get("/me", response_model=APIResponse[Optional[PartnerApplicationResponse]])
def get_my_partner_application(
    current_user: User = Depends(get_current_user),
    provider_service: ProviderService = Depends(get_provider_service),
):
    """Get the latest partner application for the current user."""
    data = provider_service.get_my_application(current_user)
    return APIResponse(success=True, message="Application status retrieved", data=data)


@router.get("/dashboard/stats", response_model=APIResponse[ProviderDashboardStats])
def get_provider_dashboard_stats(
    current_user: User = Depends(get_current_user),
    provider_service: ProviderService = Depends(get_provider_service),
):
    """Retrieve host overview statistics."""
    data = provider_service.get_dashboard_stats(current_user)
    return APIResponse(success=True, message="Dashboard stats retrieved", data=data)
