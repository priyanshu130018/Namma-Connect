"""Review repository handling review storage and rating calculations."""

import uuid
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.modules.review.domain.models import Review


class ReviewRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, review_id) -> Optional[Review]:
        if isinstance(review_id, str):
            try:
                review_id = uuid.UUID(review_id)
            except ValueError:
                return None
        return self.db.query(Review).filter(Review.id == review_id).first()

    def list_by_service(
        self,
        service_id,
        status: str = "PUBLISHED",
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Review], int]:
        if isinstance(service_id, str):
            service_id = uuid.UUID(service_id)
        q = self.db.query(Review).filter(Review.service_id == service_id)
        if status:
            q = q.filter(Review.status == status)
        total = q.count()
        items = q.order_by(desc(Review.created_at)).offset(offset).limit(limit).all()
        return items, total

    def list_by_user(self, user_id, limit: int = 20, offset: int = 0) -> Tuple[List[Review], int]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        q = self.db.query(Review).filter(Review.user_id == user_id)
        total = q.count()
        items = q.order_by(desc(Review.created_at)).offset(offset).limit(limit).all()
        return items, total

    def save(self, review: Review) -> Review:
        self.db.add(review)
        self.db.commit()
        self.db.refresh(review)
        return review

    def delete(self, review: Review) -> None:
        self.db.delete(review)
        self.db.commit()

    def get_service_rating_stats(self, service_id) -> Tuple[float, int]:
        if isinstance(service_id, str):
            service_id = uuid.UUID(service_id)
        res = (
            self.db.query(
                func.coalesce(func.avg(Review.rating), 0.0),
                func.count(Review.id),
            )
            .filter(Review.service_id == service_id, Review.status == "PUBLISHED")
            .first()
        )
        if res:
            return float(res[0]), int(res[1])
        return 0.0, 0
