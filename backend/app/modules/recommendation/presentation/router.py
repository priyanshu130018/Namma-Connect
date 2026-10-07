"""Recommendation Presentation Router (V2 REST API)."""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user, get_current_user_optional
from app.modules.user.domain.models import User
from app.modules.recommendation.infrastructure.repository import RecommendationRepository
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.recommendation.application.service import RecommendationService
from app.modules.recommendation.presentation.schemas import (
    RecordInteractionRequest,
    RecordImpressionRequest,
    RecommendationFeedbackRequest,
    RecommendationItemResponse,
    HomeRecommendationsResponse,
    UserInterestProfileResponse,
)

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


def get_recommendation_service(db: Session = Depends(get_db)) -> RecommendationService:
    rec_repo = RecommendationRepository(db)
    marketplace_repo = MarketplaceRepository(db)
    return RecommendationService(rec_repo, marketplace_repo)


@router.get("", response_model=List[RecommendationItemResponse])
def get_recommendations(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service),
):
    """Retrieve personalized recommendations for the authenticated customer."""
    return service.get_personalized_recommendations(user_id=current_user.id, limit=limit, persist=True)


@router.get("/home", response_model=Dict[str, Any])
def get_home_recommendations(
    location: Optional[str] = Query(None, description="Optional customer location or district filter"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    service: RecommendationService = Depends(get_recommendation_service),
):
    """Retrieve 5 structured Home page recommendation sections:
    
    1. Recommended for You (Personalized hybrid score or quality cold-start)
    2. Top Rated (Quality / Rating rule)
    3. Most Visited (Popularity / Review count rule)
    4. Near You (Proximity / District rule)
    5. Categories (Marketplace taxonomy entrypoints)
    """
    user_id = current_user.id if current_user else None
    return {
        "success": True,
        "data": service.get_home_recommendations(user_id=user_id, location=location),
    }


@router.get("/explore", response_model=Dict[str, Any])
def get_explore_feed(
    location: Optional[str] = Query(None, description="Optional customer location or district filter"),
    seed: Optional[int] = Query(None, description="Randomization seed for categories"),
    force_refresh: bool = Query(False, description="Force recommendation cache refresh"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    service: RecommendationService = Depends(get_recommendation_service),
):
    """Retrieve progressive Explore page recommendation sections and 10 official categories."""
    user_id = current_user.id if current_user else None
    return {
        "success": True,
        "data": service.get_explore_feed(
            user_id=user_id,
            location=location,
            seed=seed,
            force_refresh=force_refresh,
        ),
    }


@router.get("/category/{category_slug}", response_model=List[RecommendationItemResponse])
def get_category_recommendations(
    category_slug: str,
    limit: int = Query(12, ge=1, le=50),
    current_user: Optional[User] = Depends(get_current_user_optional),
    service: RecommendationService = Depends(get_recommendation_service),
):
    """Retrieve personalized recommendations scoped to a specific category."""
    user_id = current_user.id if current_user else None
    return service.get_category_recommendations(category_slug=category_slug, user_id=user_id, limit=limit)


@router.post("/interactions", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def track_interaction(
    payload: RecordInteractionRequest,
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service),
):
    """Record a raw behavioral interaction event (VIEW, CLICK, SAVE, BOOK, ADD_TO_TRIP, DISMISS)."""
    return service.track_interaction(user_id=current_user.id, payload=payload)


@router.post("/impressions", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def record_impression(
    payload: RecordImpressionRequest,
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service),
):
    """Record an impression event when recommendation cards are rendered to the user."""
    return service.track_impression(user_id=current_user.id, payload=payload)


@router.post("/feedback", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def submit_recommendation_feedback(
    payload: RecommendationFeedbackRequest,
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service),
):
    """Submit explicit user feedback on a recommendation (LIKE, DISLIKE, NOT_INTERESTED, HIDE)."""
    return service.submit_feedback(user_id=current_user.id, payload=payload)


@router.get("/profile", response_model=UserInterestProfileResponse)
def get_user_profile(
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service),
):
    """Retrieve the customer's derived interest, category, destination, and budget profile."""
    return service.get_user_interest_profile(user_id=current_user.id)


@router.post("/profile/refresh", response_model=UserInterestProfileResponse)
def refresh_user_profile(
    current_user: User = Depends(get_current_active_user),
    service: RecommendationService = Depends(get_recommendation_service),
):
    """Trigger an on-demand recalculation of the customer's interest profile."""
    service.update_user_interest_profile(user_id=current_user.id)
    return service.get_user_interest_profile(user_id=current_user.id)
