from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from datetime import date

from db.database import get_db
from db.models import Farmer, FarmListing, Login, Booking
from db.schemas import FarmerRegisterRequest, FarmListingOut, FarmListingCreate, FarmerProfileOut
from db import schemas
from ai_agent.recommendations import recommendation_agent
from ai_agent.trip_planner import trip_planner_agent

router = APIRouter()

@router.post("/services/farmer/register/{login_id}", response_model=FarmListingOut)
def register_farmer(data: FarmerRegisterRequest, login_id: int, db: Session = Depends(get_db)):
    # Find or create Farmer profile
    farmer_profile = db.query(Farmer).filter(Farmer.login_id == login_id).first()
    if not farmer_profile:
        farmer_profile = Farmer(login_id=login_id, **data.profile.dict())
        db.add(farmer_profile)
        db.flush()

    # Ensure role is set to farmer
    login = db.query(Login).filter(Login.id == login_id).first()
    if login:
        login.role = "farmer"
        if data.profile.mobile:
            login.mobile = data.profile.mobile

    # Create listing if provided
    listing = None
    if data.listing:
        listing = FarmListing(farmer_id=farmer_profile.id, **data.listing.dict())
        db.add(listing)
    
    db.commit()
    if listing:
        db.refresh(listing)
        return listing
    
    # If no listing was provided but profile created, return an empty listing object or handle differently
    # But usually registration includes a listing.
    db.refresh(farmer_profile)
    # Return dummy/empty listing if necessary or raise if listing mandatory
    if not listing:
         raise HTTPException(status_code=400, detail="Listing details are required for registration")
    return listing



@router.get("/farmer/profile/{login_id}", response_model=FarmerProfileOut)
def get_farmer_profile(login_id: int, db: Session = Depends(get_db)):
    f = db.query(Farmer).filter(Farmer.login_id == login_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Farmer profile not found")
    return f


@router.get("/farmer/listing/{listing_id}", response_model=FarmListingOut)
def get_farm_listing(listing_id: int, db: Session = Depends(get_db)):
    f = db.query(FarmListing).filter(FarmListing.id == listing_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Farm listing not found")
    return f


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


@router.get("/farmer/farm-listing")
def list_all_farms(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    # Public route to list all active listings
    farms = db.query(FarmListing).filter(FarmListing.is_active == True).offset(skip).limit(limit).all()
    return farms


@router.get("/farmer/bookings/{login_id}", response_model=list[schemas.BookingOut])
def get_farmer_bookings(login_id: int, db: Session = Depends(get_db)):
    """Get all farm stay bookings for this farmer's listings."""
    farmer = db.query(Farmer).filter(Farmer.login_id == login_id).first()
    if not farmer:
        return []

    # Get all booking for any listing owned by this farmer
    listing_ids = [l.id for l in farmer.listings]
    if not listing_ids:
        return []

    bookings = db.query(Booking).filter(
        Booking.item_id.in_(listing_ids), 
        Booking.booking_type == "farm"
    ).order_by(Booking.created_at.desc()).all()
    
    for b in bookings:
        if b.tourist:
            b.tourist_name = b.tourist.name
    return bookings


@router.get("/farmer/settings/{login_id}")
def get_settings(login_id: int, db: Session = Depends(get_db)):
    return {"login_id": login_id, "availability": "open", "instant_booking": True}


@router.get("/farmer/search/{login_id}")
def search_farmers(
    login_id: int,
    query: Optional[str] = None,
    date_start: Optional[date] = None,
    date_end: Optional[date] = None,
    time_slot: Optional[str] = None,
    db: Session = Depends(get_db)
):
    farms = db.query(FarmListing).filter(FarmListing.is_active == True).all()

    unavailable_ids = set()
    if date_start and date_end:
        overlapping = db.query(Booking.item_id).filter(
            Booking.booking_type == "farm",
            Booking.check_in <= date_end,
            Booking.check_out >= date_start,
        ).all()
        unavailable_ids = {row[0] for row in overlapping}

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
            output.append({
                "id": f.id,
                "name": f.name,
                "description": f.description,
                "location": f.location,
                "crop_types": f.crop_types,
                "farm_photo": f.farm_photo,
                "stay_available": f.stay_available,
                "matchScore": r["matchScore"],
                "available": is_available(f),
            })
        return output

    output = []
    for f in farms:
        output.append({
            "id": f.id,
            "name": f.name,
            "description": f.description,
            "location": f.location,
            "crop_types": f.crop_types,
            "farm_photo": f.farm_photo,
            "stay_available": f.stay_available,
            "available": is_available(f),
        })
    return output

@router.get("/farmer/trip-planner")
@router.post("/farmer/trip-planner")
def plan_trip(prompt: str, db: Session = Depends(get_db)):
    """AI Chatbot for planning trips and suggesting farms"""
    farms = db.query(FarmListing).filter(FarmListing.is_active == True).all()
    result = trip_planner_agent.get_trip_suggestion(prompt, farms)
    
    # Simplify the suggestions for the client
    simplified_suggestions = []
    for s in result["suggestions"]:
        f = s["item"]
        simplified_suggestions.append({
            "id": f.id,
            "name": f.name,
            "location": f.location,
            "matchScore": s["matchScore"]
        })
    
    return {
        "response": result["response"],
        "suggestions": simplified_suggestions
    }

