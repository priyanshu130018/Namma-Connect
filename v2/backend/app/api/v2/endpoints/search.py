"""Search and suggestions endpoints for Customer Marketplace."""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.common import APIResponse
from app.schemas.service import SearchResponse, SearchSuggestionsResponse
from app.services.marketplace import MarketplaceService

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=APIResponse[SearchResponse])
def search_services(
    q: str = Query("", description="Search text query (e.g. coffee, Coorg, trail)"),
    category: Optional[str] = Query(None, description="Category filter"),
    location: Optional[str] = Query(None, description="Location filter"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(12, ge=1, le=50, description="Items per page"),
    db: Session = Depends(get_db),
):
    """Full-text marketplace service search across titles, locations, and descriptions."""
    results = MarketplaceService.search_services(
        db,
        query=q,
        category=category,
        location=location,
        page=page,
        limit=limit,
    )
    return APIResponse(
        success=True,
        message=f"Search completed for '{q}'",
        data=results,
    )


@router.get("/suggestions", response_model=APIResponse[SearchSuggestionsResponse])
def search_suggestions(
    q: str = Query("", description="Autocomplete query text"),
    db: Session = Depends(get_db),
):
    """Typeahead search suggestions for auto-complete dropdowns."""
    suggestions = MarketplaceService.get_search_suggestions(db, query=q)
    return APIResponse(
        success=True,
        message="Search suggestions retrieved",
        data=suggestions,
    )
