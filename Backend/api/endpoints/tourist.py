from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import date as DateType

from db.database import get_db
from db.models import Tourist, Login, Booking, Farmer, Creator
from db.schemas import TouristOut, TouristUpdate
from db import schemas

router = APIRouter()


@router.get("/tourist/profile/{login_id}", response_model=TouristOut)
def get_profile(login_id: int, db: Session = Depends(get_db)):
    t = db.query(Tourist).filter(Tourist.login_id == login_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tourist not found")
    return t


@router.put("/tourist/profile/{login_id}", response_model=TouristOut)
def update_profile(login_id: int, data: TouristUpdate, db: Session = Depends(get_db)):
    t = db.query(Tourist).filter(Tourist.login_id == login_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tourist not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return t


@router.get("/tourist/wishlist/{login_id}")
def get_wishlist(login_id: int, db: Session = Depends(get_db)):
    t = db.query(Tourist).filter(Tourist.login_id == login_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tourist not found")
    return {"wishlist": t.wishlist}


@router.put("/tourist/wishlist/{login_id}")
def update_wishlist(login_id: int, wishlist: str, db: Session = Depends(get_db)):
    t = db.query(Tourist).filter(Tourist.login_id == login_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tourist not found")
    t.wishlist = wishlist
    db.commit()
    return {"success": True}


@router.post("/tourist/booking/{login_id}", response_model=schemas.BookingOut)
def create_booking(
    data: schemas.BookingCreate,
    login_id: int,
    db: Session = Depends(get_db)
):
    """Create a farm or creator booking for a tourist with basic availability check."""

    # Availability: prevent overlapping confirmed/pending bookings for same item
    if data.booking_type in {"farm", "creator"}:
        overlap = (
            db.query(Booking)
            .filter(
                Booking.booking_type == data.booking_type,
                Booking.item_id == data.item_id,
                Booking.status != "Cancelled",
                Booking.check_in <= data.check_out,
                Booking.check_out >= data.check_in,
            )
            .first()
        )
        if overlap:
            raise HTTPException(
                status_code=400,
                detail="Not available for the selected dates. Please choose a different range.",
            )

    booking = Booking(
        tourist_login_id=login_id,
        booking_type=data.booking_type,
        item_id=data.item_id,
        item_name=data.item_name,
        item_emoji=data.item_emoji or "🌾",
        region=data.region,
        check_in=data.check_in,
        check_out=data.check_out,
        guests=data.guests,
        total_price=data.total_price,
        collab_note=data.collab_note,
        status="Confirmed" if data.booking_type == "farm" else "Pending",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/tourist/bookings/{login_id}", response_model=list[schemas.BookingOut])
def get_bookings(
    login_id: int, 
    db: Session = Depends(get_db)
):
    """Get all bookings for a tourist by their login_id."""
    bookings = db.query(Booking).filter(Booking.tourist_login_id == login_id).order_by(Booking.created_at.desc()).all()
    for b in bookings:
        if b.tourist:
            b.tourist_name = b.tourist.name
    return bookings


@router.delete("/tourist/booking/{booking_id}/{login_id}")
def cancel_booking(booking_id: int, login_id: int, db: Session = Depends(get_db)):

    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.tourist_login_id == login_id
    ).first()

    booking.status = "Cancelled"
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


@router.post("/tourist/ai-planner/{login_id}")
def ai_planner(preferences: str, days: int = 3):
    """Placeholder for AI trip planning logic."""
    return {
        "itinerary": [
            {"day": i+1, "plan": f"Visit local farm and enjoy {preferences} activities"}
            for i in range(days)
        ],
        "suggestion": "We recommend the Coffee Harvest Tour based on your interests!"
    }


@router.get("/tourist/settings/{login_id}")
def get_settings(login_id: int, db: Session = Depends(get_db)):
    return {"tourist_id": login_id, "currency": "INR", "language": "en"}


@router.get("/tourist/search/{login_id}")
def global_search(
    login_id: int,
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
