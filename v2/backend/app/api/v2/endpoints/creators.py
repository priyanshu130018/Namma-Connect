from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
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


@router.get("/categories", response_model=APIResponse[List[dict]])
def list_creator_categories(db: Session = Depends(get_db)):
    """List static product taxonomy categories for Content Creators."""
    categories = [
        {
            "id": "photography",
            "slug": "photography",
            "name": "Photography 📷",
            "icon": "camera",
            "description": "Landscape, travel portraits, and cultural event photography.",
            "listingCount": 0,
        },
        {
            "id": "videography",
            "slug": "videography",
            "name": "Videography 🎥",
            "icon": "video",
            "description": "Travel documentaries, promo videos, and cinematic films.",
            "listingCount": 0,
        },
        {
            "id": "drone-aerial",
            "slug": "drone-aerial",
            "name": "Drone & Aerial 🚁",
            "icon": "navigation",
            "description": "Aerial estate mapping, 4K landscape flyovers, and drone video.",
            "listingCount": 0,
        },
        {
            "id": "travel-reels",
            "slug": "travel-reels",
            "name": "Travel Reels 🎬",
            "icon": "play",
            "description": "Short-form social media reels, Instagram stories, and YouTube Shorts.",
            "listingCount": 0,
        },
    ]
    return APIResponse(
        success=True,
        message="Creator categories retrieved successfully",
        data=categories,
    )


@router.get("", response_model=APIResponse[List[CreatorProfileResponse]])
def list_public_creators(
    category: Optional[str] = Query(None, description="Category filter (photography, videography, drone-aerial, travel-reels)"),
    db: Session = Depends(get_db),
):
    """List publicly discoverable verified creators with optional category filtering."""
    creators = CreatorService.list_public_creators(db)

    if category and category.strip() and category.lower() != "all":
        cat_clean = category.strip().lower()
        filtered = []
        for c in creators:
            specs = [s.lower() for s in (c.specialties or [])]
            if cat_clean in specs or any(cat_clean in s for s in specs):
                filtered.append(c)
            elif cat_clean == "photography" and any("photo" in s for s in specs):
                filtered.append(c)
            elif cat_clean == "videography" and any("video" in s or "film" in s for s in specs):
                filtered.append(c)
            elif cat_clean == "drone-aerial" and any("drone" in s or "aerial" in s for s in specs):
                filtered.append(c)
            elif cat_clean == "travel-reels" and any("reel" in s or "short" in s for s in specs):
                filtered.append(c)
        creators = filtered

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
