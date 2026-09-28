"""Search and suggestions endpoints for Customer Marketplace."""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user_optional
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.service import SearchResponse, SearchSuggestionsResponse
from app.services.marketplace import MarketplaceService

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=APIResponse[SearchResponse])
def search_services(
    q: str = Query("", description="Search text query (e.g. coffee, Coorg, trail)"),
    category: Optional[str] = Query(None, description="Category filter"),
    location: Optional[str] = Query(None, description="Location filter"),
    min_price: Optional[float] = Query(None, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, description="Maximum price filter"),
    min_rating: Optional[float] = Query(None, description="Minimum rating filter"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(12, ge=1, le=50, description="Items per page"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Semantic vector & keyword marketplace service search using pgvector."""
    results = MarketplaceService.search_services(
        db,
        query=q,
        category=category,
        location=location,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        page=page,
        limit=limit,
    )

    if current_user and q and q.strip():
        try:
            from app.services.recommendation_engine import RecommendationEngine
            RecommendationEngine.record_interaction(
                db=db,
                user_id=current_user.id,
                event_type="search",
                service_id=None,
                metadata={"query": q.strip(), "category": category, "location": location},
            )
        except Exception:
            pass

    msg = (
        f'No services found for "{q}".'
        if (not results.results and q)
        else f"Search completed for '{q}'"
        if q
        else "Marketplace services retrieved successfully."
    )
    return APIResponse(
        success=True,
        message=msg,
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


@router.get("/recent")
def get_recent_searches(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Fetch genuine recent search queries performed by authenticated user."""
    if not current_user:
        return APIResponse(
            success=True,
            message="Recent searches retrieved",
            data=[],
        )
    
    from app.models.recommendation import UserInteraction
    import json
    
    interactions = (
        db.query(UserInteraction)
        .filter(UserInteraction.user_id == current_user.id, UserInteraction.event_type == "search")
        .order_by(UserInteraction.created_at.desc())
        .limit(10)
        .all()
    )
    
    recent_searches = []
    seen = set()
    for item in interactions:
        try:
            meta = json.loads(item.metadata_json or "{}")
            query_str = meta.get("query") or meta.get("q")
            if query_str and query_str.strip() and query_str.strip().lower() not in seen:
                seen.add(query_str.strip().lower())
                recent_searches.append(query_str.strip())
        except Exception:
            continue
            
    return APIResponse(
        success=True,
        message="Recent searches retrieved",
        data=recent_searches,
    )

