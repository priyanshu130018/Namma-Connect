from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date

from db.database import get_db
from db.models import Creator, Login, Booking, FarmListing
from db.schemas import CreatorRegisterRequest, CreatorOut
from db import schemas
from ai_agent.recommendations import recommendation_agent
from ai_agent.trip_planner import trip_planner_agent

router = APIRouter()


def _creator_review_map(db: Session, creator_ids: list[int]) -> dict[int, int]:
    if not creator_ids:
        return {}

    rows = (
        db.query(Booking.creator_id, func.count(Booking.id))
        .filter(Booking.booking_type == "creator", Booking.creator_id.in_(creator_ids))
        .group_by(Booking.creator_id)
        .all()
    )
    return {int(creator_id): int(count) for creator_id, count in rows}


def _creator_payload(c: Creator, review_count: int = 0, match_score: Optional[int] = None) -> dict:
    # Deterministic mock rating based on ID
    mock_rating = 4.2 + (c.id % 8) / 10.0
    if mock_rating > 5.0: mock_rating = 5.0

    payload = {
        "id": c.id,
        "name": c.name,
        "niche": c.niche,
        "bio": c.bio,
        "state": c.state,
        "location": f"{c.city}, {c.state}" if c.city else c.state,
        "is_verified": c.is_verified,
        "review_count": review_count,
        "reviews": review_count,
        "rating": mock_rating,
        "avg_rating": mock_rating,
        "rate": float(c.rate) if c.rate else 0.0,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "user_id": c.user_id,
    }
    if match_score is not None:
        payload["matchScore"] = match_score
    return payload

@router.post("/services/creator/register/{user_id}", response_model=CreatorOut)
def register_creator(data: CreatorRegisterRequest, user_id: int, db: Session = Depends(get_db)):
    existing = db.query(Creator).filter(Creator.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already registered as creator")

    creator = Creator(user_id=user_id, **data.dict())
    db.add(creator)

    # Update role and mobile in login_detail
    login = db.query(Login).filter(Login.id == user_id).first()
    if login:
        login.role = "creator"
        if data.mobile:
            login.mobile = data.mobile

    db.commit()
    db.refresh(creator)
    return creator


@router.get("/creator/profile/{user_id}", response_model=CreatorOut)
def get_profile(user_id: int, db: Session = Depends(get_db)):
    c = db.query(Creator).filter(Creator.user_id == user_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Creator not found")
    return c




@router.put("/creator/profile/{user_id}", response_model=CreatorOut)
def update_profile(user_id: int, data: CreatorRegisterRequest, db: Session = Depends(get_db)):
    c = db.query(Creator).filter(Creator.user_id == user_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Creator not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.get("/creator/bookings/{user_id}")
def get_creator_bookings(user_id: int, db: Session = Depends(get_db)):
    """Get bookings for a creator: those they received and those they made."""
    creator = db.query(Creator).filter(Creator.user_id == user_id).first()
    if not creator:
        return {"received": [], "made": []}
    
    # Bookings Received (Collaborations)
    received = db.query(Booking).filter(
        Booking.creator_id == creator.id, 
        Booking.booking_type == "creator"
    ).order_by(Booking.created_at.desc()).all()
    
    from .tourist import _populate_booking_extra
    for r in received:
        _populate_booking_extra(r)

    # Bookings Made (as a tourist/user)
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


@router.get("/creator/settings/{user_id}")
def get_settings(user_id: int, db: Session = Depends(get_db)):
    # Placeholder for settings logic (e.g. notifications, privacy)
    creator = db.query(Creator).filter(Creator.user_id == user_id).first()
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    return {"user_id": user_id, "notifications": True, "privacy": "public"}


@router.put("/creator/booking/{booking_id}/status/{user_id}")
def update_creator_booking_status(
    booking_id: int,
    user_id: int,
    data: schemas.BookingStatusUpdate,
    db: Session = Depends(get_db)
):
    """Creator updates the status of a booking for their service."""
    creator = db.query(Creator).filter(Creator.user_id == user_id).first()
    if not creator:
        raise HTTPException(status_code=404, detail="Creator profile not found")

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Verify that the booking's creator_id belongs to this creator
    if not booking.creator_id or booking.creator.id != creator.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this booking")

    booking.status = data.status
    db.commit()
    return {"success": True, "status": data.status}


@router.get("/creator/search/{user_id}")
def search_creators(
    user_id: int,
    query: Optional[str] = None,
    date_start: Optional[date] = None,
    date_end: Optional[date] = None,
    db: Session = Depends(get_db)
):
    creators = db.query(Creator).all()
    review_map = _creator_review_map(db, [c.id for c in creators])

    if query and query.strip():
        results = recommendation_agent.get_recommendations(query, creators, item_type="creator")
        output = []
        for r in results:
            c = r["item"]
            output.append(
                _creator_payload(c, review_count=review_map.get(c.id, 0), match_score=r["matchScore"])
            )
        return output

    return [_creator_payload(c, review_count=review_map.get(c.id, 0)) for c in creators]


@router.get("/creator/listing")
def list_creators(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    creators = db.query(Creator).offset(skip).limit(limit).all()
    review_map = _creator_review_map(db, [c.id for c in creators])
    return [_creator_payload(c, review_count=review_map.get(c.id, 0)) for c in creators]


@router.get("/creator/check-availability/{creator_id}")
def check_creator_availability(
    creator_id: int,
    date_start: date,
    date_end: date,
    db: Session = Depends(get_db)
):
    """Check if a creator is available for a specific date range. If not, suggest 3 alt dates."""
    overlap = (
        db.query(Booking)
        .filter(
            Booking.booking_type == "creator",
            Booking.creator_id == creator_id,
            Booking.status != "cancelled",
            Booking.check_in <= date_end,
            Booking.check_out >= date_start,
        )
        .first()
    )
    
    if not overlap:
        return {"available": True, "suggested_dates": []}

    from datetime import timedelta
    duration = (date_end - date_start).days
    if duration <= 0:
        duration = 1
        
    future_bookings = (
        db.query(Booking.check_in, Booking.check_out)
        .filter(
            Booking.booking_type == "creator",
            Booking.creator_id == creator_id,
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

@router.get("/creator/{creator_id}", response_model=CreatorOut)
def get_creator_by_id(creator_id: int, db: Session = Depends(get_db)):
    c = db.query(Creator).filter(Creator.id == creator_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Creator not found")
    return c

@router.get("/creator/trip-planner/{user_id}")
@router.post("/creator/trip-planner/{user_id}")
def plan_trip(user_id: int, prompt: str, db: Session = Depends(get_db)):
    """AI Chatbot for planning trips and suggesting creators (reusing planner logic)"""
    # Note: trip_planner_agent is primarily farm-focused right now, 
    # but we'll adapt it or provide a similar experience here.
    creator = db.query(Creator).filter(Creator.user_id == user_id).first()
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    farms = db.query(FarmListing).filter(FarmListing.is_active == True).all()
    result = trip_planner_agent.get_trip_suggestion(prompt, farms)
    
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




