"""Review presentation router."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.modules.user.domain.models import User
from app.modules.review.infrastructure.repository import ReviewRepository
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.booking.infrastructure.repository import BookingRepository
from app.modules.review.application.service import ReviewService
from app.modules.review.presentation.schemas import (
    ReviewCreateRequest,
    ReviewResponse,
    ReviewStatsResponse,
)

router = APIRouter(tags=["Reviews"])


def get_review_service(db: Session = Depends(get_db)) -> ReviewService:
    review_repo = ReviewRepository(db)
    marketplace_repo = MarketplaceRepository(db)
    booking_repo = BookingRepository(db)
    return ReviewService(review_repo, marketplace_repo, booking_repo)


@router.post("/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    payload: ReviewCreateRequest,
    current_user: User = Depends(get_current_active_user),
    service: ReviewService = Depends(get_review_service),
):
    """Submit a review and rating for a service."""
    return service.create_review(user=current_user, payload=payload)


@router.get("/reviews/service/{service_id}", response_model=dict)
def list_service_reviews(
    service_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: ReviewService = Depends(get_review_service),
):
    """List public reviews for a specific service."""
    return service.list_service_reviews(service_id=service_id, page=page, page_size=page_size)


@router.get("/reviews/service/{service_id}/stats", response_model=ReviewStatsResponse)
def get_service_review_stats(
    service_id: str,
    service: ReviewService = Depends(get_review_service),
):
    """Get aggregated rating statistics for a service."""
    return service.get_service_stats(service_id=service_id)
