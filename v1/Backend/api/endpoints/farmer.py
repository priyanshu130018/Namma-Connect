from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date as DateType

from db.database import get_db
from db.models import Farmer, FarmListing, Login, Booking
from db.schemas import FarmerRegisterRequest, FarmListingOut, FarmListingCreate, FarmerProfileOut
from db import schemas
from ai_agent.recommendations import recommendation_agent
from ai_agent.trip_planner import trip_planner_agent

router = APIRouter()


def _farm_review_map(db: Session, farm_ids: list[int]) -> dict[int, int]:
    if not farm_ids:
        return {}

    rows = (
        db.query(Booking.farm_id, func.count(Booking.id))
        .filter(Booking.booking_type == "farm", Booking.farm_id.in_(farm_ids))
        .group_by(Booking.farm_id)
        .all()
    )
    return {int(farm_id): int(count) for farm_id, count in rows}


def _farm_payload(
    farm: FarmListing,
    review_count: int = 0,
    match_score: Optional[int] = None,
    available: Optional[bool] = None,
) -> dict:
    mock_rating = 4.0 + (farm.id % 10) / 10.0
    if mock_rating > 5.0:
        mock_rating = 5.0

    payload = {
        "id": farm.id,
        "farm_name": farm.farm_name,
        "name": farm.farm_name,
        "farmer_id": farm.farmer_id,
        "user_id": farm.owner.user_id if farm.owner else None,
        "description": farm.description,
        "location": f"{farm.city}, {farm.state}" if farm.city and farm.state else (farm.city or farm.state or ""),
        "area": farm.address,
        "city": farm.city,
        "state": farm.state,
        "mobile": farm.mobile,
        "email": farm.email,
        "crop_types": farm.crop_types,
        "farm_photo": farm.farm_photo,
        "stay_available": bool(farm.stay_available),
        "transport_available": bool(farm.transport_available),
        "activities": farm.activities,
        "price_per_night": float(farm.price_per_night) if farm.price_per_night else None,
        "is_active": farm.is_active,
        "created_at": farm.created_at.isoformat() if getattr(farm, "created_at", None) else None,
        "is_verified": farm.owner.is_verified if getattr(farm, "owner", None) else False,
        "review_count": review_count,
        "reviews": review_count,
        "rating": mock_rating,
        "avg_rating": mock_rating,
    }

    if match_score is not None:
        payload["matchScore"] = match_score
    if available is not None:
        payload["available"] = available
    return payload

@router.post("/services/farmer/register/{user_id}", response_model=FarmerProfileOut)
def register_farmer(data: FarmerRegisterRequest, user_id: int, db: Session = Depends(get_db)):
    # Find or create Farmer profile
    farmer_profile = db.query(Farmer).filter(Farmer.user_id == user_id).first()
    profile_data = data.profile.dict(exclude_none=True)

    if not farmer_profile:
        farmer_profile = Farmer(user_id=user_id, **profile_data)
        db.add(farmer_profile)
    else:
        for key, value in profile_data.items():
            setattr(farmer_profile, key, value)

    # Ensure role is set to farmer
    login = db.query(Login).filter(Login.id == user_id).first()
    if login:
        login.role = "farmer"
        if data.profile.mobile:
            login.mobile = data.profile.mobile

    db.commit()
    db.refresh(farmer_profile)
    return farmer_profile



@router.get("/farmer/profile/{user_id}", response_model=FarmerProfileOut)
def get_farmer_profile(user_id: int, db: Session = Depends(get_db)):
    f = db.query(Farmer).filter(Farmer.user_id == user_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Farmer profile not found")
    return f


@router.get("/farmer/by-profile/{farmer_id}", response_model=FarmerProfileOut)
def get_farmer_by_profile_id(farmer_id: int, db: Session = Depends(get_db)):
    """Fetch farmer profile by the farmer table's primary key (farmer.id).
    Used by FarmerCard to show the actual host name from farm_listing.farmer_id.
    """
    f = db.query(Farmer).filter(Farmer.id == farmer_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Farmer profile not found")
    return f



@router.put("/farmer/profile/{user_id}", response_model=FarmerProfileOut)
def update_farmer_profile(user_id: int, data: Optional[dict] = None, db: Session = Depends(get_db)):
    """Update farmer profile fields by user_id."""
    from fastapi import Body
    f = db.query(Farmer).filter(Farmer.user_id == user_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Farmer profile not found")
    if data:
        allowed_fields = {"name", "street_address", "city", "area", "state", "postal_code", "mobile", "email", "age", "country", "aadhaar_no"}
        for key, value in data.items():
            if key in allowed_fields and value is not None and value != "":
                setattr(f, key, value)
        if data.get("mobile"):
            login_obj = db.query(Login).filter(Login.id == user_id).first()
            if login_obj:
                login_obj.mobile = data["mobile"]
    db.commit()
    db.refresh(f)
    return f


@router.get("/farmer/listing/{listing_id}", response_model=FarmListingOut)
def get_farm_listing(listing_id: int, db: Session = Depends(get_db)):
    f = db.query(FarmListing).filter(FarmListing.id == listing_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Farm listing not found")
    return f


@router.get("/farmer/check-availability/{listing_id}")
def check_farm_availability(
    listing_id: int,
    date_start: DateType,
    date_end: DateType,
    db: Session = Depends(get_db)
):
    """Check if a farm listing is available for a specific date range. If not, suggest 3 alt dates."""
    overlap = (
        db.query(Booking)
        .filter(
            Booking.booking_type == "farm",
            Booking.farm_id == listing_id,
            Booking.status != "cancelled",
            Booking.check_in <= date_end,
            Booking.check_out >= date_start,
        )
        .first()
    )
    
    if not overlap:
        return {"available": True, "suggested_dates": []}

    # If not available, suggest alternative dates
    from datetime import timedelta
    duration = (date_end - date_start).days
    if duration <= 0:
        duration = 1
        
    future_bookings = (
        db.query(Booking.check_in, Booking.check_out)
        .filter(
            Booking.booking_type == "farm",
            Booking.farm_id == listing_id,
            Booking.status != "cancelled",
            Booking.check_out >= date_start
        )
        .order_by(Booking.check_in)
        .all()
    )
    
    suggested = []
    current_start = overlap.check_out + timedelta(days=1)
    
    for _ in range(3):
        while True:
            current_end = current_start + timedelta(days=duration)
            conflict = False
            for fb_in, fb_out in future_bookings:
                if current_start <= fb_out and current_end >= fb_in:
                    conflict = True
                    current_start = fb_out + timedelta(days=1)
                    break 
            if not conflict:
                suggested.append({
                    "check_in": current_start.isoformat(),
                    "check_out": current_end.isoformat()
                })
                current_start = current_end + timedelta(days=1)
                break

    return {"available": False, "suggested_dates": suggested}


@router.get("/farmer/list/{user_id}", response_model=list[FarmListingOut])
def get_farmer_listings(user_id: int, db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.user_id == user_id).first()
    if not farmer:
        return []
    listings = (
        db.query(FarmListing)
        .filter(FarmListing.farmer_id == farmer.id)
        .order_by(FarmListing.created_at.desc())
        .all()
    )
    return listings


@router.post("/farmer/list/{user_id}", response_model=FarmListingOut)
def create_farm_listing(user_id: int, data: FarmListingCreate, db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.user_id == user_id).first()
    if not farmer:
        login = db.query(Login).filter(Login.id == user_id).first()
        farmer = Farmer(
            user_id=user_id,
            name=login.full_name if login else "Unknown",
            mobile=login.mobile if login else None,
            email=login.email if login else None,
        )
        db.add(farmer)
        db.flush()

    login = db.query(Login).filter(Login.id == user_id).first()
    if login:
        login.role = "farmer"

    listing = FarmListing(farmer_id=farmer.id, **data.dict())
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


@router.put("/farmer/listing/{listing_id}", response_model=FarmListingOut)
def update_farm_listing(listing_id: int, data: FarmListingCreate, db: Session = Depends(get_db)):
    f = db.query(FarmListing).filter(FarmListing.id == listing_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Farm listing not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(f, k, v)
    db.commit()
    db.refresh(f)
    return f


@router.delete("/farmer/listing/{listing_id}/{user_id}")
def delete_farm_listing(listing_id: int, user_id: int, db: Session = Depends(get_db)):
    farmer = db.query(Farmer).filter(Farmer.user_id == user_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    listing = (
        db.query(FarmListing)
        .filter(FarmListing.id == listing_id, FarmListing.farmer_id == farmer.id)
        .first()
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Farm listing not found")

    db.delete(listing)
    db.commit()
    return {"message": "Listing deleted successfully"}


@router.get("/farmer/farm-listing")
def list_all_farms(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """Public route — returns all farm listings regardless of is_active status."""
    farms = db.query(FarmListing).offset(skip).limit(limit).all()
    review_map = _farm_review_map(db, [f.id for f in farms])
    return [_farm_payload(f, review_count=review_map.get(f.id, 0)) for f in farms]




@router.get("/farmer/settings/{user_id}")
def get_settings(user_id: int, db: Session = Depends(get_db)):
    return {"user_id": user_id, "availability": "open", "instant_booking": True}


@router.put("/farmer/booking/{booking_id}/status/{user_id}")
def update_farmer_booking_status(
    booking_id: int,
    user_id: int,
    data: schemas.BookingStatusUpdate,
    db: Session = Depends(get_db)
):
    """Farmer updates the status of a booking for their listing."""
    farmer = db.query(Farmer).filter(Farmer.user_id == user_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Verify that the booking's farm_id belongs to this farmer
    if not booking.farm_id or booking.farm.farmer_id != farmer.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this booking")

    booking.status = data.status
    db.commit()
    return {"success": True, "status": data.status}


@router.get("/farmer/bookings/{user_id}")
def get_farmer_bookings(user_id: int, db: Session = Depends(get_db)):
    """Get bookings for a farmer: those they received and those they made."""
    farmer = db.query(Farmer).filter(Farmer.user_id == user_id).first()
    if not farmer:
        return {"received": [], "made": []}

    # Bookings Received (for their farms)
    farm_ids = [f.id for f in farmer.listings]
    received = []
    if farm_ids:
        received = (
            db.query(Booking)
            .filter(Booking.booking_type == "farm", Booking.farm_id.in_(farm_ids))
            .order_by(Booking.created_at.desc())
            .all()
        )

    # Bookings Made (as a tourist/user)
    # We use a similar logic as tourist.py
    from .tourist import _populate_booking_extra
    
    # Received bookings need population too
    for r in received:
        _populate_booking_extra(r)

    # Note: Farmer might have tourist profile if they booked something
    from db.models import Tourist
    tourist_profile = db.query(Tourist).filter(Tourist.user_id == user_id).first()
    made = []
    if tourist_profile:
        made = db.query(Booking).filter(Booking.tourist_id == tourist_profile.id).order_by(Booking.created_at.desc()).all()
        for m in made:
            _populate_booking_extra(m)

    return {
        "received": received,
        "made": made
    }


@router.get("/farmer/search/{user_id}")
def search_farmers(
    user_id: int,
    query: Optional[str] = None,
    date_start: Optional[DateType] = None,
    date_end: Optional[DateType] = None,
    time_slot: Optional[str] = None,
    db: Session = Depends(get_db)
):
    farms = db.query(FarmListing).filter(FarmListing.is_active == True).all()
    review_map = _farm_review_map(db, [f.id for f in farms])

    unavailable_ids = set()
    if date_start and date_end:
        overlapping = db.query(Booking.farm_id).filter(
            Booking.booking_type == "farm",
            Booking.check_in <= date_end,
            Booking.check_out >= date_start,
        ).all()
        unavailable_ids = {row[0] for row in overlapping if row[0] is not None}

    def is_available(f: FarmListing) -> bool:
        available = True
        if date_start and date_end and f.id in unavailable_ids:
            available = False

        if available and time_slot:
            slot = time_slot.lower()
            stay_text = (f.stay_available or "").lower()
            if slot and stay_text:
                available = slot in stay_text
            else:
                available = False

        return available

    if query:
        results = recommendation_agent.get_recommendations(query, farms, item_type="farm")
        output = []
        for r in results:
            f = r["item"]
            output.append(
                _farm_payload(
                    f,
                    review_count=review_map.get(f.id, 0),
                    match_score=r["matchScore"],
                    available=is_available(f),
                )
            )
        return output

    return [
        _farm_payload(f, review_count=review_map.get(f.id, 0), available=is_available(f))
        for f in farms
    ]

@router.get("/farmer/trip-planner/{user_id}")
@router.post("/farmer/trip-planner/{user_id}")
def plan_trip(user_id: int, prompt: str, db: Session = Depends(get_db)):
    """AI Chatbot for planning trips and suggesting farms"""
    farms = db.query(FarmListing).filter(FarmListing.is_active == True).all()
    result = trip_planner_agent.get_trip_suggestion(prompt, farms)
    
    # Simplify the suggestions for the client
    simplified_suggestions = []
    for s in result["suggestions"]:
        f = s["item"]
        simplified_suggestions.append({
            "id": f.id,
            "name": f.farm_name,
            "location": f"{f.city}, {f.state}" if f.city else f.state,
            "matchScore": s["matchScore"]
        })
    
    return {
        "response": result["response"],
        "suggestions": simplified_suggestions
    }

