"""API Endpoints for Recommendations, Personalization, and Provider NC Score."""

from typing import Dict, Any, Optional, List
import uuid

from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user, get_current_user_optional, require_partner
from app.models.user import User
from app.services.recommendation_engine import RecommendationEngine
from app.services.nc_score_engine import NCScoreEngine
from app.tasks.recommendation_tasks import (
    process_user_interaction_task,
    recalculate_nc_score_task,
)


router = APIRouter(tags=["recommendations"])


class InteractionPayload(BaseModel):
    event_type: str
    service_id: Optional[str] = None
    category_slug: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class PreferencePayload(BaseModel):
    language: Optional[str] = "en"
    categories: Optional[List[str]] = None
    destinations: Optional[List[str]] = None


@router.get("/recommendations")
def get_recommendations_list(
    limit: int = Query(10, ge=1, le=50),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Fetch list of top personalized recommendations."""
    recs = RecommendationEngine.get_home_recommendations(user=current_user, db=db)
    return {
        "success": True,
        "data": recs.get("recommended_for_you", [])[:limit],
    }


@router.get("/recommendations/explore")
@router.get("/explore")
def get_explore_feed(
    location: Optional[str] = Query(None, description="Optional customer location or district filter"),
    seed: Optional[int] = Query(None, description="Optional randomization seed for categories"),
    force_refresh: bool = Query(False, description="Force recommendation cache refresh"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Fetch structured Progressive Explore discovery feed matching all 10 official categories.

    Progressive sections:
    1. Categories: 10 official categories in randomized order.
    2. Nearby Places: only when reliable location is available.
    3. Because You Visited: based on real customer interaction/booking evidence.
    4. Personalized For You: based on preferences and behavioral signals.
    5. Top & Most Visited: composite real marketplace quality signals.
    """
    feed = RecommendationEngine.get_explore_feed(
        user=current_user,
        db=db,
        location=location,
        seed=seed,
        force_refresh=force_refresh,
    )
    return {
        "success": True,
        "data": feed,
    }


@router.get("/recommendations/home")
def get_home_recommendations(
    location: Optional[str] = Query(None, description="Optional customer location filter"),
    force_refresh: bool = Query(False, description="Force recommendation cache refresh"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Fetch structured Home page recommendations from Redis cache or fast DB fallback.

    Returns 5 separated sections:
    1. Recommended for You (Personalized 8-component score)
    2. Top Rated (Quality/Rating rule)
    3. Most Visited (Popularity rule)
    4. Near You (Location proximity rule)
    5. Categories (Taxonomy entry points)
    """
    recs = RecommendationEngine.get_home_recommendations(
        user=current_user,
        db=db,
        location=location,
        force_refresh=force_refresh,
    )
    return {
        "success": True,
        "data": recs,
    }


@router.post("/recommendations/interactions")
def record_user_interaction(
    payload: InteractionPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log customer behavioral interaction signal and enqueue background celery task."""
    srv_id = uuid.UUID(payload.service_id) if payload.service_id else None
    meta = dict(payload.metadata or {})
    if payload.category_slug and "category_slug" not in meta:
        meta["category_slug"] = payload.category_slug
    
    # Authoritative DB record
    interaction = RecommendationEngine.record_interaction(
        db=db,
        user_id=current_user.id,
        event_type=payload.event_type,
        service_id=srv_id,
        metadata=meta,
    )
    
    # Enqueue async task for queue processing & profile refresh
    try:
        process_user_interaction_task.delay(
            user_id_str=str(current_user.id),
            event_type=payload.event_type,
            service_id_str=str(srv_id) if srv_id else None,
            metadata=payload.metadata,
        )
    except Exception:
        # Fallback if celery broker is offline
        pass

    return {
        "success": True,
        "data": {
            "interaction_id": str(interaction.id),
            "event_type": interaction.event_type,
            "weight": interaction.weight,
        },
    }


@router.get("/recommendations/preferences")
def get_user_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get derived user interest profile and preferences."""
    profile = RecommendationEngine.update_user_interest_profile(db, current_user.id)
    return {
        "success": True,
        "data": {
            "user_id": str(current_user.id),
            "category_affinity": profile.category_affinity_json,
            "destination_affinity": profile.destination_affinity_json,
            "topic_affinity": profile.topic_affinity_json,
            "budget_band": profile.budget_band_json,
            "language": profile.language,
            "last_updated": profile.last_updated.isoformat(),
        },
    }


@router.get("/provider/nc-score")
def get_provider_nc_score(
    service_id: Optional[str] = Query(None),
    force_refresh: bool = Query(False),
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Fetch explainable 7-pillar NC Score breakdown for partner provider."""
    srv_uuid = uuid.UUID(service_id) if service_id else None
    score, components = NCScoreEngine.calculate_nc_score(
        db=db,
        provider_id=current_user.id,
        service_id=srv_uuid,
        force_refresh=force_refresh,
    )
    return {
        "success": True,
        "data": {
            "provider_id": str(current_user.id),
            "nc_score": score,
            "tier": components.get("tier", "Bronze"),
            "components": components,
            "explanations": {
                "completion_rate": "Ratio of completed bookings to accepted bookings.",
                "response_score": "Speed and frequency of customer inquiry responses.",
                "bayesian_rating": "Bayesian smoothed customer review ratings.",
                "reliability_score": "Inverse provider cancellation rate.",
                "acceptance_rate": "Percentage of lead requests accepted.",
                "repeat_customers": "Ratio of bookings from returning clients.",
                "profile_completeness": "Provider profile metadata and verification completeness.",
            },
        },
    }


@router.get("/provider/recommendations")
def get_provider_action_recommendations(
    current_user: User = Depends(require_partner),
    db: Session = Depends(get_db),
):
    """Fetch explainable decision-support action recommendations for partner provider."""
    actions = NCScoreEngine.generate_provider_action_recommendations(
        db=db,
        provider_id=current_user.id,
    )
    return {
        "success": True,
        "data": {
            "provider_id": str(current_user.id),
            "action_recommendations": actions,
        },
    }
