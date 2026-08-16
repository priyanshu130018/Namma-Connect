from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging

from app.core.database import get_db
from app.models.farm import FarmListing
from app.models.user import CreatorProfile
from app.ai.recommender import recommender_agent
from app.ai.chatbot import trip_planner_agent
from app.dependencies.auth import get_current_user
from app.models.user import Login

LOGGER = logging.getLogger(__name__)
router = APIRouter()

class RecommendRequest(BaseModel):
    query: str
    item_type: str = "farm" # farm or creator

class ChatRequest(BaseModel):
    prompt: str
    session_state: Optional[Dict[str, Any]] = None

# ─────────────────────────────────────────────────────────────
# CANONICAL RESOURCE-BASED ENDPOINTS (AUTHENTICATED)
# ─────────────────────────────────────────────────────────────

@router.post("/ai/chat")
def ai_chat_new(
    req: ChatRequest, 
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)  # Authenticated user mandatory!
):
    try:
        farms = db.query(FarmListing).filter(FarmListing.status == "active").all()
        creators = db.query(CreatorProfile).all()
        
        # Format lists slightly to match recommender inputs if needed
        result = trip_planner_agent.get_trip_suggestion(
            prompt=req.prompt,
            farm_listings=farms,
            creators=creators,
            session_state=req.session_state
        )
        return {"success": True, "data": result}
    except Exception as e:
        LOGGER.warning(f"AI Chat model failed, using rule-based suggestion fallback: {str(e)}")
        fallback_response = {
            "response": f"I received your request: '{req.prompt}'. While my AI brain is resting, I suggest exploring some of our beautiful local farm stays!",
            "suggestions": []
        }
        try:
            farms = db.query(FarmListing).filter(FarmListing.status == "active").limit(2).all()
            for f in farms:
                fallback_response["suggestions"].append({
                    "id": f.id,
                    "name": f.name,
                    "location": f"{f.district or ''}, {f.state or ''}".strip(", "),
                    "score": 0.75
                })
        except Exception:
            pass
        return {"success": True, "data": fallback_response}
