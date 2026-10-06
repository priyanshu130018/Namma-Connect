"""Marketplace presentation router."""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.modules.user.domain.models import User
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.marketplace.application.service import MarketplaceService
from app.modules.marketplace.presentation.schemas import (
    CategoryResponse,
    ServiceResponse,
    ServiceCreateRequest,
    ServiceUpdateRequest,
    ServiceAvailabilityResponse,
    ServiceAvailabilityCreateRequest,
    SavedServiceResponse,
)

router = APIRouter(tags=["Marketplace"])


def get_marketplace_service(db: Session = Depends(get_db)) -> MarketplaceService:
    repo = MarketplaceRepository(db)
    return MarketplaceService(repo)




@router.get("/saved", response_model=List[SavedServiceResponse])
def list_saved_services(
    current_user: User = Depends(get_current_active_user),
    service: MarketplaceService = Depends(get_marketplace_service),
):
    """List all saved services for the current user."""
    return service.list_saved_services(user_id=current_user.id)


@router.post("/saved/{service_id}", response_model=dict, status_code=status.HTTP_201_CREATED)
def save_service(
    service_id: str,
    notes: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    service: MarketplaceService = Depends(get_marketplace_service),
):
    """Bookmark/save a service to the user's wishlist."""
    return service.save_service(user_id=current_user.id, service_id=service_id, notes=notes)


@router.delete("/saved/{service_id}", response_model=dict)
def remove_saved_service(
    service_id: str,
    current_user: User = Depends(get_current_active_user),
    service: MarketplaceService = Depends(get_marketplace_service),
):
    """Remove a service from the user's wishlist."""
    return service.remove_saved_service(user_id=current_user.id, service_id=service_id)
