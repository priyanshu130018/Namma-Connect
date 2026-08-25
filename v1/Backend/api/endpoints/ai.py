from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List

from db.database import get_db
from db.models import FarmListing, Creator
from ai_agent.trip_planner import trip_planner_agent

router = APIRouter()

@router.post("/ai/chat")
async def ai_chat(
    prompt: str = Body(..., embed=True),
    session_state: Optional[Dict[str, Any]] = Body(None),
    db: Session = Depends(get_db)
):
    """
    Unified AI Chatbot endpoint for Namma Gig.
    Handles searching for both Farms and Creators based on user prompt.
    """
    try:
        # Fetch active farms and verified creators
        farms = db.query(FarmListing).filter(FarmListing.is_active == True).all()
        creators = db.query(Creator).filter(Creator.is_verified == True).all()
        
        # Get suggestions from the upgraded agent
        result = trip_planner_agent.get_trip_suggestion(
            prompt=prompt,
            farm_listings=farms,
            creators=creators,
            session_state=session_state
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Chat error: {str(e)}")
