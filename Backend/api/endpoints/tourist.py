from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import date as DateType

from db.database import get_db
from db.models import Tourist, Login, Booking, Farmer, Creator, FarmListing
from db.schemas import TouristOut, TouristUpdate
from db import schemas

router = APIRouter()


@router.get("/tourist/profile/{user_id}", response_model=TouristOut)
def get_profile(user_id: int, db: Session = Depends(get_db)):
    t = db.query(Tourist).filter(Tourist.user_id == user_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tourist not found")
    return t


@router.put("/tourist/profile/{user_id}", response_model=TouristOut)
def update_profile(user_id: int, data: TouristUpdate, db: Session = Depends(get_db)):
    t = db.query(Tourist).filter(Tourist.user_id == user_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tourist not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t


@router.get("/tourist/wishlist/{user_id}")
def get_wishlist(user_id: int, db: Session = Depends(get_db)):
    t = db.query(Tourist).filter(Tourist.user_id == user_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tourist not found")
    return {"wishlist": t.wishlist}


@router.put("/tourist/wishlist/{user_id}")
def update_wishlist(user_id: int, wishlist: str, db: Session = Depends(get_db)):
    t = db.query(Tourist).filter(Tourist.user_id == user_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tourist not found")
    t.wishlist = wishlist
    db.commit()
    return {"success": True}


@router.post("/tourist/booking/{user_id}", response_model=schemas.BookingOut)
def create_booking(
    data: schemas.BookingCreate,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Create a farm or creator booking for a tourist with basic availability check."""
    
    # 1. Get tourist profile ID from user_id
    tourist_profile = db.query(Tourist).filter(Tourist.user_id == user_id).first()
    if not tourist_profile:
        # Auto-create tourist profile if missing (optional, but safer)
        login_obj = db.query(Login).filter(Login.id == user_id).first()
        if not login_obj:
            raise HTTPException(status_code=404, detail="User not found")
        tourist_profile = Tourist(user_id=user_id, name=login_obj.full_name)
        db.add(tourist_profile)
        db.flush()

    # 2. Self-Booking Check (Strict)
    if data.booking_type == "farm" and data.farm_id:
        farm = db.query(FarmListing).filter(FarmListing.id == data.farm_id).first()
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        # Check if user_id of the requester is the same as the owner's user_id
        owner = db.query(Farmer).filter(Farmer.id == farm.farmer_id).first()
        if owner and owner.user_id == user_id:
            raise HTTPException(status_code=400, detail="Strictly prohibited: You cannot book your own farm listing.")
    
    if data.booking_type == "creator" and data.creator_id:
        creator = db.query(Creator).filter(Creator.id == data.creator_id).first()
        if not creator:
            raise HTTPException(status_code=404, detail="Creator not found")
        if creator.user_id == user_id:
             raise HTTPException(status_code=400, detail="Strictly prohibited: You cannot book your own services.")

    # 3. Availability Check
    overlap_filter = [
        Booking.booking_type == data.booking_type,
        Booking.status != "cancelled",
        Booking.check_in <= data.check_out,
        Booking.check_out >= data.check_in
    ]
    if data.booking_type == "farm":
        overlap_filter.append(Booking.farm_id == data.farm_id)
    else:
        overlap_filter.append(Booking.creator_id == data.creator_id)

    overlap = db.query(Booking).filter(and_(*overlap_filter)).first()

    if overlap:
        raise HTTPException(
            status_code=400,
            detail="Not available for the selected dates. Please choose a different range.",
        )

    # 3. Create Booking
    booking = Booking(
        tourist_id=tourist_profile.id,
        booking_type=data.booking_type,
        farm_id=data.farm_id,
        creator_id=data.creator_id,
        check_in=data.check_in,
        check_out=data.check_out,
        adults=data.adults,
        children=data.children,
        guests=data.adults + data.children,
        total_price=data.total_price,
        collab_note=data.collab_note,
        status="pending", # All new bookings start as pending
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    # Populate extra fields for response
    return _populate_booking_extra(booking)


def _populate_booking_extra(b: Booking):
    """Helper to add transient fields for frontend."""
    # This assumes relationships are set up in models.py
    if b.booking_type == "farm" and b.farm:
        b.item_name = b.farm.farm_name
        b.item_emoji = "🌾"
        b.region = b.farm.state
    elif b.booking_type == "creator" and b.creator:
        b.item_name = b.creator.name
        b.item_emoji = "🎬"
        b.region = b.creator.state
    
    if b.tourist:
        b.tourist_name = b.tourist.name
    return b


@router.get("/tourist/bookings/{user_id}", response_model=list[schemas.BookingOut])
def get_bookings(
    user_id: int, 
    db: Session = Depends(get_db)
):
    """Get all bookings for a tourist by their user_id (login ID)."""
    tourist_profile = db.query(Tourist).filter(Tourist.user_id == user_id).first()
    if not tourist_profile:
        return []

    bookings = db.query(Booking).filter(Booking.tourist_id == tourist_profile.id).order_by(Booking.created_at.desc()).all()
    for b in bookings:
        _populate_booking_extra(b)
    return bookings


@router.delete("/tourist/booking/{booking_id}/{user_id}")
def cancel_booking(booking_id: int, user_id: int, db: Session = Depends(get_db)):
    tourist_profile = db.query(Tourist).filter(Tourist.user_id == user_id).first()
    if not tourist_profile:
        raise HTTPException(status_code=404, detail="Tourist profile not found")

    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.tourist_id == tourist_profile.id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = "cancelled"
    db.commit()

    return {"success": True}


@router.put("/booking/{booking_id}/status")
def update_booking_status(
    booking_id: int, 
    data: schemas.BookingStatusUpdate, 
    db: Session = Depends(get_db)
):
    """Update status of a booking (Confirmed/Cancelled/etc.)"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking.status = data.status
    db.commit()
    return {"success": True, "status": data.status}


@router.post("/tourist/ai-planner/{user_id}")
def ai_planner(preferences: str, days: int = 3):
    """Placeholder for AI trip planning logic."""
    return {
        "itinerary": [
            {"day": i+1, "plan": f"Visit local farm and enjoy {preferences} activities"}
            for i in range(days)
        ],
        "suggestion": "We recommend the Coffee Harvest Tour based on your interests!"
    }


@router.get("/tourist/settings/{user_id}")
def get_settings(user_id: int, db: Session = Depends(get_db)):
    return {"user_id": user_id, "currency": "INR", "language": "en"}


@router.get("/tourist/search/{user_id}")
def global_search(
    user_id: int,
    query: Optional[str] = None,
    date_start: Optional[DateType] = None,
    date_end: Optional[DateType] = None,
    db: Session = Depends(get_db)
):
    """Tourist search across farms and creators."""
    
    results = {"farms": [], "creators": []}
    
    if query:
        # Search Farms
        results["farms"] = db.query(Farmer).filter(or_(
            Farmer.name.ilike(f"%{query}%"),
            Farmer.area.ilike(f"%{query}%"),
            Farmer.crop_types.ilike(f"%{query}%")
        )).limit(10).all()
        
        # Search Creators
        results["creators"] = db.query(Creator).filter(or_(
            Creator.name.ilike(f"%{query}%"),
            Creator.niche.ilike(f"%{query}%"),
            Creator.state.ilike(f"%{query}%")
        )).limit(10).all()
    
    return results
