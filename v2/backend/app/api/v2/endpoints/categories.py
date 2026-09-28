"""Marketplace Categories API Endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.common import APIResponse
from app.schemas.category import MarketplaceCategoryResponse
from app.repositories.category import CategoryRepository
from app.services.marketplace import MarketplaceService

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=APIResponse[List[MarketplaceCategoryResponse]])
def list_categories(
    marketplace_type: Optional[str] = Query(None, description="Filter by marketplace_type (ACTIVITY, CONTENT_CREATOR)"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db),
):
    """List reference taxonomy categories."""
    MarketplaceService.ensure_seeded(db)
    categories = CategoryRepository.list_categories(db, marketplace_type=marketplace_type, is_active=is_active)
    resp_data = [
        MarketplaceCategoryResponse(
            id=str(c.id),
            slug=c.slug,
            name=c.name,
            marketplace_type=c.marketplace_type,
            icon=c.icon,
            description=c.description,
            is_active=c.is_active,
            sort_order=c.sort_order,
            created_at=c.created_at,
        )
        for c in categories
    ]
    return APIResponse(
        success=True,
        message=f"Retrieved {len(resp_data)} categories",
        data=resp_data,
    )


@router.get("/{slug}", response_model=APIResponse[MarketplaceCategoryResponse])
def get_category_by_slug(
    slug: str,
    db: Session = Depends(get_db),
):
    """Get category details by slug."""
    MarketplaceService.ensure_seeded(db)
    category = CategoryRepository.get_by_slug(db, slug=slug)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Category with slug '{slug}' not found")

    return APIResponse(
        success=True,
        message="Category retrieved successfully",
        data=MarketplaceCategoryResponse(
            id=str(category.id),
            slug=category.slug,
            name=category.name,
            marketplace_type=category.marketplace_type,
            icon=category.icon,
            description=category.description,
            is_active=category.is_active,
            sort_order=category.sort_order,
            created_at=category.created_at,
        ),
    )
