"""Admin presentation router."""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.modules.user.domain.models import User
from app.modules.admin.infrastructure.repository import AdminRepository
from app.modules.admin.application.service import AdminService
from app.modules.admin.presentation.schemas import (
    PlatformSettingRequest,
    PlatformSettingResponse,
    PlatformOverviewStatsResponse,
)

router = APIRouter(prefix="/admin", tags=["Admin Control Center"])


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    repo = AdminRepository(db)
    return AdminService(repo)


@router.get("/overview", response_model=PlatformOverviewStatsResponse)
def get_platform_overview(
    current_user: User = Depends(get_current_active_user),
    service: AdminService = Depends(get_admin_service),
):
    """Get high-level platform health, volume, GMV, and activity statistics."""
    return service.get_overview_stats(admin=current_user)


@router.get("/settings", response_model=List[PlatformSettingResponse])
def list_platform_settings(
    current_user: User = Depends(get_current_active_user),
    service: AdminService = Depends(get_admin_service),
):
    """List system and business platform configuration settings."""
    return service.get_settings(admin=current_user)


@router.post("/settings", response_model=PlatformSettingResponse)
def update_platform_setting(
    payload: PlatformSettingRequest,
    current_user: User = Depends(get_current_active_user),
    service: AdminService = Depends(get_admin_service),
):
    """Set or update a platform setting."""
    return service.set_setting(admin=current_user, payload=payload)
