"""Review application service."""

import json
import uuid
from typing import Dict, Any, List
from fastapi import HTTPException, status
from app.modules.review.infrastructure.repository import ReviewRepository
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.booking.infrastructure.repository import BookingRepository
from app.modules.review.presentation.schemas import ReviewCreateRequest
from app.modules.review.domain.models import Review
from app.modules.user.domain.models import User


class ReviewService:
    def __init__(
        self,
        review_repo: ReviewRepository,
        marketplace_repo: MarketplaceRepository,
        booking_repo: BookingRepository,
    ):
        self.review_repo = review_repo
        self.marketplace_repo = marketplace_repo
        self.booking_repo = booking_repo

    def create_review(self, user: User, payload: ReviewCreateRequest) -> Dict[str, Any]:
        service = self.marketplace_repo.get_service_by_id(payload.service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

        # Prevent reviewing own service
        if str(service.provider_id) == str(user.id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot review your own service listing.")

        is_verified = True
        booking_uuid = None
        if payload.booking_id:
            booking = self.booking_repo.get_by_id(payload.booking_id)
            if booking:
                booking_uuid = booking.id

        review = Review(
            user_id=user.id,
            user_name=user.full_name or "Guest",
            service_id=service.id,
            booking_id=booking_uuid,
            rating=float(payload.rating),
            comment=payload.comment.strip(),
            is_verified=is_verified,
            status="PUBLISHED",
        )
        saved = self.review_repo.save(review)

        # Update aggregated rating and review count on the service
        avg_rating, count = self.review_repo.get_service_rating_stats(service.id)
        service.rating = round(avg_rating, 2)
        service.reviews_count = count
        self.marketplace_repo.save_service(service)

        return self._serialize_review(saved)

    def list_service_reviews(self, service_id: str, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        offset = (page - 1) * page_size
        items, total = self.review_repo.list_by_service(service_id=service_id, limit=page_size, offset=offset)
        return {
            "items": [self._serialize_review(r) for r in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1,
        }

    def get_service_stats(self, service_id: str) -> Dict[str, Any]:
        avg_rating, count = self.review_repo.get_service_rating_stats(service_id)
        return {
            "service_id": service_id,
            "average_rating": round(avg_rating, 2),
            "total_reviews": count,
        }

    def _serialize_review(self, r: Review) -> Dict[str, Any]:
        return {
            "id": str(r.id),
            "user_id": str(r.user_id) if r.user_id else "",
            "service_id": str(r.service_id),
            "booking_id": str(r.booking_id) if r.booking_id else None,
            "rating": int(r.rating),
            "cleanliness_rating": None,
            "hospitality_rating": None,
            "accuracy_rating": None,
            "value_rating": None,
            "comment": r.comment,
            "photos": [],
            "status": r.status,
            "is_verified_booking": r.is_verified,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
