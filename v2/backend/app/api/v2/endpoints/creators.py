"""Endpoints for Public Creator Discovery and Private Creator Studio."""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.creator import (
    CreatorProfileResponse,
    CreatorProfileUpdateRequest,
    PortfolioItemSchema,
    CreatorPackageSchema,
)
from app.services.creator import CreatorService

router = APIRouter(prefix="/creators", tags=["Creators"])


@router.get("", response_model=APIResponse[List[CreatorProfileResponse]])
def list_public_creators(db: Session = Depends(get_db)):
    """List publicly discoverable verified creators."""
    creators = CreatorService.list_public_creators(db)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(creators)} creators",
        data=creators,
    )


@router.get("/me/profile", response_model=APIResponse[CreatorProfileResponse])
def get_my_creator_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve private creator studio profile for the authenticated user."""
    profile = CreatorService.get_or_create_creator_profile(db, current_user)
    return APIResponse(
        success=True,
        message="Creator profile retrieved successfully",
        data=profile,
    )


@router.put("/me/profile", response_model=APIResponse[CreatorProfileResponse])
def update_my_creator_profile(
    payload: CreatorProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update private creator studio profile details."""
    profile = CreatorService.update_creator_profile(db, current_user, payload)
    return APIResponse(
        success=True,
        message="Creator profile updated successfully",
        data=profile,
    )


@router.post("/me/portfolio", response_model=APIResponse[CreatorProfileResponse])
def add_portfolio_item(
    payload: PortfolioItemSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload/add a portfolio media piece to the creator's showcase."""
    profile = CreatorService.add_portfolio_item(db, current_user, payload)
    return APIResponse(
        success=True,
        message="Portfolio media item added successfully",
        data=profile,
    )


@router.post("/me/packages", response_model=APIResponse[CreatorProfileResponse])
def add_or_update_package(
    payload: CreatorPackageSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add or configure a fixed-price media production package."""
    profile = CreatorService.add_or_update_package(db, current_user, payload)
    return APIResponse(
        success=True,
        message="Media package saved successfully",
        data=profile,
    )


@router.get("/{creator_id}", response_model=APIResponse[CreatorProfileResponse])
def get_public_creator_detail(
    creator_id: str,
    db: Session = Depends(get_db),
):
    """Get public media kit and portfolio for a specific creator."""
    creator = CreatorService.get_public_creator_by_id(db, creator_id)
    return APIResponse(
        success=True,
        message="Creator media kit retrieved successfully",
        data=creator,
    )
