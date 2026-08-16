from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from fastapi import HTTPException, status
from typing import Optional, List
from datetime import date as DateType, timedelta

from app.models.user import Login, FarmerProfile
from app.models.farm import FarmListing
from app.models.booking import Booking
from app.schemas.farm import FarmListingCreate

class FarmService:
    @staticmethod
    def _farm_review_map(db: Session, farm_ids: list[int]) -> dict[int, tuple[int, float]]:
        if not farm_ids:
            return {}
        from app.models.review import Review
        rows = (
            db.query(
                Review.target_id,
                func.count(Review.id),
                func.coalesce(func.avg(Review.rating), 4.8)
            )
            .filter(Review.target_type == "farm", Review.target_id.in_(farm_ids))
            .group_by(Review.target_id)
            .all()
        )
        return {int(target_id): (int(count), round(float(avg_r), 1)) for target_id, count, avg_r in rows}

    @staticmethod
    def _farm_payload(
        farm: FarmListing,
        review_count: int = 0,
        avg_rating: float = 4.8,
        match_score: Optional[int] = None,
        available: Optional[bool] = None,
    ) -> dict:
        crops = farm.primary_crops or []
        crop_types_str = ", ".join(crops) if isinstance(crops, list) else str(crops)

        return {
            "id": farm.id,
            "farm_name": farm.name,
            "name": farm.name,
            "farmer_id": farm.farmer_id,
            "user_id": farm.farmer_profile.user_id if farm.farmer_profile else None,
            "description": farm.description,
            "location": f"{farm.district or ''}, {farm.state or ''}".strip(", "),
            "area": farm.address,
            "city": farm.district,
            "state": farm.state,
            "village": farm.village,
            "taluk": farm.taluk,
            "district": farm.district,
            "pincode": farm.pincode,
            "mobile": farm.farmer_profile.user.mobile if farm.farmer_profile and farm.farmer_profile.user else None,
            "email": farm.farmer_profile.user.email if farm.farmer_profile and farm.farmer_profile.user else None,
            "crop_types": crop_types_str,
            "primary_crops": crops,
            "farm_photo": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80",
            "stay_available": "yes",
            "transport_available": "yes",
            "activities": "Guided tours, fruit picking",
            "price_per_night": float(farm.price_from) if farm.price_from else 0.0,
            "price_from": float(farm.price_from) if farm.price_from else 0.0,
            "is_active": farm.status == "active",
            "created_at": farm.created_at.isoformat() if getattr(farm, "created_at", None) else None,
            "is_verified": farm.farmer_profile.verification_status == "approved" if farm.farmer_profile else False,
            "review_count": review_count,
            "reviews": review_count,
            "rating": avg_rating,
            "avg_rating": avg_rating,
            "matchScore": match_score,
            "available": available
        }

    @staticmethod
    def get_farm_listing(db: Session, listing_id: int) -> FarmListing:
        f = db.query(FarmListing).filter(FarmListing.id == listing_id).first()
        if not f:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm listing not found")
        return f

    @staticmethod
    def check_farm_availability(db: Session, listing_id: int, date_start: DateType, date_end: DateType):
        overlap = (
            db.query(Booking)
            .filter(
                Booking.farm_id == listing_id,
                Booking.status != "cancelled",
                Booking.booking_date <= date_end,
                func.coalesce(Booking.check_out, Booking.booking_date) >= date_start,
            )
            .first()
        )
        
        if not overlap:
            return {"available": True, "suggested_dates": []}

        duration = (date_end - date_start).days
        if duration <= 0:
            duration = 1
            
        future_bookings = (
            db.query(Booking.booking_date, Booking.check_out)
            .filter(
                Booking.farm_id == listing_id,
                Booking.status != "cancelled",
                func.coalesce(Booking.check_out, Booking.booking_date) >= date_start
            )
            .order_by(Booking.booking_date)
            .all()
        )
        
        suggested = []
        co_date = overlap.check_out if overlap.check_out else overlap.booking_date
        current_start = co_date + timedelta(days=1)
        
        for _ in range(3):
            while True:
                current_end = current_start + timedelta(days=duration)
                conflict = False
                for fb_in, fb_out in future_bookings:
                    fb_out_date = fb_out if fb_out else fb_in
                    if current_start <= fb_out_date and current_end >= fb_in:
                        conflict = True
                        current_start = fb_out_date + timedelta(days=1)
                        break 
                if not conflict:
                    suggested.append({
                        "check_in": current_start.isoformat(),
                        "check_out": current_end.isoformat()
                    })
                    current_start = current_end + timedelta(days=1)
                    break

        return {"available": False, "suggested_dates": suggested}

    @classmethod
    def get_farmer_listings(cls, db: Session, user_id: int) -> List[FarmListing]:
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
        if not farmer:
            return []
        return (
            db.query(FarmListing)
            .filter(FarmListing.farmer_id == farmer.id)
            .order_by(FarmListing.created_at.desc())
            .all()
        )

    @classmethod
    def create_farm_listing(cls, db: Session, user_id: int, data: FarmListingCreate) -> FarmListing:
        farmer = db.query(FarmerProfile).filter(
            FarmerProfile.user_id == user_id, 
            FarmerProfile.verification_status == "approved"
        ).first()
        if not farmer:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You must have an approved Farmer application to publish a farm listing."
            )

        listing = FarmListing(farmer_id=farmer.id, **data.model_dump())
        db.add(listing)
        db.commit()
        db.refresh(listing)
        return listing

    @classmethod
    def update_farm_listing(cls, db: Session, listing_id: int, data: FarmListingCreate) -> FarmListing:
        f = db.query(FarmListing).filter(FarmListing.id == listing_id).first()
        if not f:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm listing not found")
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(f, k, v)
        db.commit()
        db.refresh(f)
        return f

    @classmethod
    def delete_farm_listing(cls, db: Session, listing_id: int, user_id: int):
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
        if not farmer:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Farmer profile not found")

        listing = (
            db.query(FarmListing)
            .filter(FarmListing.id == listing_id, FarmListing.farmer_id == farmer.id)
            .first()
        )
        if not listing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm listing not found or unauthorized")

        db.delete(listing)
        db.commit()
        return {"message": "Listing deleted successfully"}

    @classmethod
    def list_all_farms(cls, db: Session, skip: int = 0, limit: int = 50) -> List[dict]:
        farms = db.query(FarmListing).offset(skip).limit(limit).all()
        review_map = cls._farm_review_map(db, [f.id for f in farms])
        return [
            cls._farm_payload(
                f,
                review_count=review_map.get(f.id, (0, 4.8))[0],
                avg_rating=review_map.get(f.id, (0, 4.8))[1]
            )
            for f in farms
        ]

    @classmethod
    def search_farms(
        cls,
        db: Session,
        user_id: int,
        query: Optional[str] = None,
        date_start: Optional[DateType] = None,
        date_end: Optional[DateType] = None,
        time_slot: Optional[str] = None
    ) -> List[dict]:
        farms = db.query(FarmListing).filter(FarmListing.status == "active").all()
        review_map = cls._farm_review_map(db, [f.id for f in farms])

        unavailable_ids = set()
        if date_start and date_end:
            overlapping = db.query(Booking.farm_id).filter(
                Booking.status != "cancelled",
                Booking.booking_date <= date_end,
                func.coalesce(Booking.check_out, Booking.booking_date) >= date_start,
            ).all()
            unavailable_ids = {row[0] for row in overlapping if row[0] is not None}

        def is_available(f: FarmListing) -> bool:
            if date_start and date_end and f.id in unavailable_ids:
                return False
            return True

        if query:
            from app.ai.recommender import recommender_agent
            results = recommender_agent.get_recommendations(query, farms, item_type="farm")
            output = []
            for r in results:
                f = r["item"]
                r_count, r_avg = review_map.get(f.id, (0, 4.8))
                output.append(
                    cls._farm_payload(
                        f,
                        review_count=r_count,
                        avg_rating=r_avg,
                        match_score=r["matchScore"],
                        available=is_available(f),
                    )
                )
            return output

        return [
            cls._farm_payload(
                f,
                review_count=review_map.get(f.id, (0, 4.8))[0],
                avg_rating=review_map.get(f.id, (0, 4.8))[1],
                available=is_available(f)
            )
            for f in farms
        ]
