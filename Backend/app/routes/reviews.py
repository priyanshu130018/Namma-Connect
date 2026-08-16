from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.database import get_db
from app.services.review_service import ReviewService
from app.schemas.review import ReviewCreate, ReviewUpdate, ReviewOut, ReviewListResponse
from app.dependencies.auth import get_current_user
from app.models.user import Login

router = APIRouter()

@router.post("/reviews", response_model=ReviewOut)
def create_review(
    data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    review = ReviewService.create_review(db, current_user.id, data)
    return ReviewService.get_review(db, review.id)

@router.get("/reviews", response_model=ReviewListResponse)
def list_reviews(
    target_type: Optional[str] = Query(None),
    target_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    return ReviewService.list_reviews(db, target_type=target_type, target_id=target_id, user_id=user_id)

@router.get("/reviews/me", response_model=ReviewListResponse)
def list_my_reviews(
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    return ReviewService.list_reviews(db, user_id=current_user.id)

@router.get("/reviews/{id}", response_model=ReviewOut)
def get_review(
    id: int,
    db: Session = Depends(get_db)
):
    return ReviewService.get_review(db, id)

@router.patch("/reviews/{id}", response_model=ReviewOut)
def update_review(
    id: int,
    data: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    ReviewService.update_review(db, id, current_user.id, data)
    return ReviewService.get_review(db, id)

@router.delete("/reviews/{id}")
def delete_review(
    id: int,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    return ReviewService.delete_review(db, id, current_user.id)
