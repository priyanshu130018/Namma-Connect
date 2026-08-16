from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from typing import Optional, List, Dict, Any

from app.models.user import Login, FarmerProfile, CreatorProfile
from app.models.farm import FarmListing
from app.models.activity import Activity
from app.models.booking import Booking
from app.models.collaboration import Collaboration
from app.models.review import Review
from app.schemas.review import ReviewCreate, ReviewUpdate

class ReviewService:
    @classmethod
    def create_review(cls, db: Session, user_id: int, data: ReviewCreate) -> Review:
        # 1. Verify target existence
        target_name = None
        if data.target_type == "farm":
            farm = db.query(FarmListing).filter(FarmListing.id == data.target_id).first()
            if not farm:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")
            target_name = farm.name

            # 2. Check for completed stay booking
            completed = db.query(Booking).filter(
                Booking.user_id == user_id,
                Booking.farm_id == data.target_id,
                Booking.status == "completed"
            ).first()
            if not completed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Review not allowed: You may only review a farm after completing a stay."
                )

        elif data.target_type == "activity":
            activity = db.query(Activity).filter(Activity.id == data.target_id).first()
            if not activity:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
            target_name = activity.name

            # 2. Check for completed activity booking
            completed = db.query(Booking).filter(
                Booking.user_id == user_id,
                Booking.activity_id == data.target_id,
                Booking.status == "completed"
            ).first()
            if not completed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Review not allowed: You may only review an activity after completing a booking."
                )

        elif data.target_type == "creator":
            creator = db.query(CreatorProfile).filter(CreatorProfile.id == data.target_id).first()
            if not creator:
                creator = db.query(CreatorProfile).filter(CreatorProfile.user_id == data.target_id).first()
            if not creator:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Creator not found")
            target_name = creator.display_name

            # 2. Check for completed collaboration where user is the farmer partner
            farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
            farmer_id = farmer.id if farmer else -1
            completed = db.query(Collaboration).filter(
                Collaboration.creator_id == creator.id,
                Collaboration.farmer_id == farmer_id,
                Collaboration.status == "completed"
            ).first()
            if not completed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Review not allowed: You may only review a creator after completing a collaboration."
                )

        # 3. Check for existing duplicate review
        existing = db.query(Review).filter(
            Review.user_id == user_id,
            Review.target_type == data.target_type,
            Review.target_id == data.target_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already reviewed this target. Please update your existing review."
            )

        # 4. Create review
        review = Review(
            user_id=user_id,
            target_type=data.target_type,
            target_id=data.target_id,
            rating=data.rating,
            comment=data.comment
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        return review

    @classmethod
    def list_reviews(
        cls,
        db: Session,
        target_type: Optional[str] = None,
        target_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        q = db.query(Review)
        if target_type:
            q = q.filter(Review.target_type == target_type)
        if target_id is not None:
            q = q.filter(Review.target_id == target_id)
        if user_id is not None:
            q = q.filter(Review.user_id == user_id)

        reviews = q.order_by(Review.created_at.desc()).all()
        total = len(reviews)
        avg_rating = round(sum(r.rating for r in reviews) / total, 1) if total > 0 else 0.0

        # Enrich with user and target names
        user_ids = {r.user_id for r in reviews}
        users_map = {u.id: u.name for u in db.query(Login).filter(Login.id.in_(user_ids)).all()} if user_ids else {}

        # Resolve target names
        target_names: Dict[tuple, str] = {}
        for r in reviews:
            key = (r.target_type, r.target_id)
            if key not in target_names:
                if r.target_type == "farm":
                    f = db.query(FarmListing).filter(FarmListing.id == r.target_id).first()
                    target_names[key] = f.name if f else f"Farm #{r.target_id}"
                elif r.target_type == "activity":
                    a = db.query(Activity).filter(Activity.id == r.target_id).first()
                    target_names[key] = a.name if a else f"Activity #{r.target_id}"
                elif r.target_type == "creator":
                    c = db.query(CreatorProfile).filter(CreatorProfile.id == r.target_id).first()
                    target_names[key] = c.display_name if c else f"Creator #{r.target_id}"

        results = []
        for r in reviews:
            results.append({
                "id": r.id,
                "user_id": r.user_id,
                "user_name": users_map.get(r.user_id, f"User {r.user_id}"),
                "target_type": r.target_type,
                "target_id": r.target_id,
                "target_name": target_names.get((r.target_type, r.target_id), "Unknown"),
                "rating": r.rating,
                "comment": r.comment,
                "created_at": r.created_at,
                "updated_at": r.updated_at
            })

        return {
            "total": total,
            "avg_rating": avg_rating,
            "reviews": results
        }

    @classmethod
    def get_review(cls, db: Session, review_id: int) -> dict:
        r = db.query(Review).filter(Review.id == review_id).first()
        if not r:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
        u = db.query(Login).filter(Login.id == r.user_id).first()
        user_name = u.name if u else f"User {r.user_id}"

        target_name = "Unknown"
        if r.target_type == "farm":
            f = db.query(FarmListing).filter(FarmListing.id == r.target_id).first()
            target_name = f.name if f else f"Farm #{r.target_id}"
        elif r.target_type == "activity":
            a = db.query(Activity).filter(Activity.id == r.target_id).first()
            target_name = a.name if a else f"Activity #{r.target_id}"
        elif r.target_type == "creator":
            c = db.query(CreatorProfile).filter(CreatorProfile.id == r.target_id).first()
            target_name = c.display_name if c else f"Creator #{r.target_id}"

        return {
            "id": r.id,
            "user_id": r.user_id,
            "user_name": user_name,
            "target_type": r.target_type,
            "target_id": r.target_id,
            "target_name": target_name,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        }

    @classmethod
    def update_review(cls, db: Session, review_id: int, user_id: int, data: ReviewUpdate) -> Review:
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

        # Ownership verification
        if review.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are only authorized to edit your own reviews."
            )

        if data.rating is not None:
            review.rating = data.rating
        if data.comment is not None:
            review.comment = data.comment

        db.commit()
        db.refresh(review)
        return review

    @classmethod
    def delete_review(cls, db: Session, review_id: int, user_id: int, is_admin: bool = False) -> dict:
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

        # Ownership or Admin verification
        if review.user_id != user_id and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are only authorized to delete your own reviews."
            )

        db.delete(review)
        db.commit()
        return {"success": True, "message": "Review deleted successfully"}
