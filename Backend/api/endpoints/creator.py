from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from datetime import date

from db.database import get_db
from db.models import Creator, Login, Booking, FarmListing
from db.schemas import CreatorRegisterRequest, CreatorOut
from db import schemas
from ai_agent.recommendations import recommendation_agent
from ai_agent.trip_planner import trip_planner_agent

router = APIRouter()

@router.post("/services/creator/register/{login_id}", response_model=CreatorOut)
def register_creator(data: CreatorRegisterRequest, login_id: int, db: Session = Depends(get_db)):
    existing = db.query(Creator).filter(Creator.login_id == login_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already registered as creator")

    creator = Creator(login_id=login_id, **data.dict())
    db.add(creator)

    # Update role and mobile in login_detail
    login = db.query(Login).filter(Login.id == login_id).first()
    if login:
        login.role = "creator"
        if data.mobile:
            login.mobile = data.mobile

    db.commit()
    db.refresh(creator)
    return creator


@router.get("/creator/profile/{login_id}", response_model=CreatorOut)
def get_profile(login_id: int, db: Session = Depends(get_db)):
    c = db.query(Creator).filter(Creator.login_id == login_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Creator not found")
    return c


@router.get("/creator/{creator_id}", response_model=CreatorOut)
def get_creator_by_id(creator_id: int, db: Session = Depends(get_db)):
    c = db.query(Creator).filter(Creator.id == creator_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Creator not found")
    return c


@router.put("/creator/profile/{login_id}", response_model=CreatorOut)
def update_profile(login_id: int, data: CreatorRegisterRequest, db: Session = Depends(get_db)):
    c = db.query(Creator).filter(Creator.login_id == login_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Creator not found")
    for k, v in data.dict(exclude_none=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.get("/creator/bookings/{login_id}", response_model=list[schemas.BookingOut])
def get_creator_bookings(login_id: int, db: Session = Depends(get_db)):
    """Get all collaborations assigned to this creator."""
    creator = db.query(Creator).filter(Creator.login_id == login_id).first()
    if not creator:
        return []
    
    bookings = db.query(Booking).filter(
        Booking.item_id == creator.id, 
        Booking.booking_type == "creator"
    ).order_by(Booking.created_at.desc()).all()
    
    for b in bookings:
        if b.tourist:
            b.tourist_name = b.tourist.name
    return bookings


@router.get("/creator/settings/{login_id}")
def get_settings(login_id: int, db: Session = Depends(get_db)):
    # Placeholder for settings logic (e.g. notifications, privacy)
    return {"login_id": login_id, "notifications": True, "privacy": "public"}


@router.get("/creator/search/{login_id}")
def search_creators(
    login_id: int,
    query: Optional[str] = None,
    date_start: Optional[date] = None,
    date_end: Optional[date] = None,
    db: Session = Depends(get_db)
):
    creators = db.query(Creator).all()

    if query:
        results = recommendation_agent.get_recommendations(query, creators, item_type="creator")
        output = []
        for r in results:
            c = r["item"]
            output.append({
                "id": c.id,
                "name": c.name,
                "niche": c.niche,
                "bio": c.bio,
                "location": c.state,
                "matchScore": r["matchScore"],
            })
        return output

    output = []
    for c in creators:
        output.append({
            "id": c.id,
            "name": c.name,
            "niche": c.niche,
            "bio": c.bio,
            "location": c.state,
        })
    return output

@router.get("/creator/trip-planner")
@router.post("/creator/trip-planner")
def plan_trip(prompt: str, db: Session = Depends(get_db)):
    """AI Chatbot for planning trips and suggesting creators (reusing planner logic)"""
    # Note: trip_planner_agent is primarily farm-focused right now, 
    # but we'll adapt it or provide a similar experience here.
    farms = db.query(FarmListing).filter(FarmListing.is_active == True).all()
    result = trip_planner_agent.get_trip_suggestion(prompt, farms)
    
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


@router.get("/creator/listing")
def list_creators(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    creators = db.query(Creator).offset(skip).limit(limit).all()
    return creators


