from fastapi import APIRouter, Depends, Query, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.database import get_db
from app.services.user_service import UserService
from app.schemas.user import (
    FarmerProfileOut, ProfileUpdate, ProfileOut,
    CreatorProfileOut, ContactCreate, ContactOut,
    MessageCreate, MessageOut, NotificationOut,
    TokenResponse, FarmerProfileUpdate, CreatorProfileUpdate,
    FarmerRegisterRequest, CreatorRegisterRequest
)
from app.dependencies.auth import get_current_user
from app.models import Login, Wishlist

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# CANONICAL PROFILE ENDPOINTS (PREFIXED WITH /api)
# ─────────────────────────────────────────────────────────────

@router.get("/profile", response_model=ProfileOut)
def get_my_profile(user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserService.get_profile(db, user.id)

@router.patch("/profile", response_model=ProfileOut)
def update_my_profile(data: ProfileUpdate, user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserService.update_profile(db, user.id, data)

@router.get("/farmers/me", response_model=FarmerProfileOut)
def get_my_farmer_profile(user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserService.get_farmer_profile(db, user.id)

@router.patch("/farmers/me", response_model=FarmerProfileOut)
def update_my_farmer_profile(data: FarmerProfileUpdate, user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserService.update_farmer_profile(db, user.id, data.model_dump(exclude_none=True))

@router.get("/farmers/{id}", response_model=FarmerProfileOut)
def get_farmer_by_id(id: int, db: Session = Depends(get_db)):
    # Find farmer profile by profile ID (or user ID, standard fallback)
    from app.models.user import FarmerProfile
    f = db.query(FarmerProfile).filter(FarmerProfile.id == id).first()
    if not f:
        # Fallback check by user_id
        f = db.query(FarmerProfile).filter(FarmerProfile.user_id == id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Farmer profile not found")
    return f

@router.get("/creators", response_model=List[CreatorProfileOut])
def list_creators_canonical(
    query: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return UserService.list_creators(db, query=query, category=category)

@router.get("/creators/me", response_model=CreatorProfileOut)
def get_my_creator_profile(user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserService.get_creator_profile(db, user.id)

@router.patch("/creators/me", response_model=CreatorProfileOut)
def update_my_creator_profile(data: CreatorProfileUpdate, user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserService.update_creator_profile(db, user.id, data.model_dump(exclude_none=True))

@router.get("/creators/{id}", response_model=CreatorProfileOut)
def get_creator_by_id_canonical(id: int, db: Session = Depends(get_db)):
    from app.models.user import CreatorProfile
    c = db.query(CreatorProfile).filter(CreatorProfile.id == id).first()
    if not c:
        # Fallback check by user_id
        c = db.query(CreatorProfile).filter(CreatorProfile.user_id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Creator profile not found")
    return c

@router.get("/creators/{id}/availability")
def check_creator_availability_canonical(
    id: int,
    date_start: Optional[str] = Query(None),
    date_end: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    from datetime import date
    d_start = date.fromisoformat(date_start) if date_start else None
    d_end = date.fromisoformat(date_end) if date_end else None
    return UserService.check_creator_availability(db, id, d_start, d_end)

# ─────────────────────────────────────────────────────────────
# CANONICAL WISHLIST ENDPOINTS
# ─────────────────────────────────────────────────────────────

@router.get("/wishlist")
def get_my_wishlist(user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    wishlist_items = UserService.get_wishlist(db, user.id)
    items = [
        {"id": w.id, "target_type": w.target_type, "target_id": w.target_id, "created_at": w.created_at}
        for w in wishlist_items
    ]
    farm_ids = [str(w.target_id) for w in wishlist_items if w.target_type == "farm"]
    creator_ids = [str(w.target_id) for w in wishlist_items if w.target_type == "creator"]
    activity_ids = [str(w.target_id) for w in wishlist_items if w.target_type == "activity"]
    
    return {
        "items": items,
        "wishlist": ",".join(farm_ids),
        "farms": farm_ids,
        "creators": creator_ids,
        "activities": activity_ids
    }

@router.post("/wishlist")
def add_to_my_wishlist(target_type: str = Query("farm"), target_id: int = Query(...), user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    UserService.add_to_wishlist(db, user.id, target_type, target_id)
    return {"success": True}

@router.delete("/wishlist/{target_type}/{target_id}")
def remove_from_my_wishlist(target_type: str, target_id: int, user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserService.remove_from_wishlist(db, user.id, target_type, target_id)

# ─────────────────────────────────────────────────────────────
# CANONICAL MESSAGES & NOTIFICATIONS (SECURE)
# ─────────────────────────────────────────────────────────────

@router.get("/messages", response_model=List[dict])
def get_my_messages(user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserService.get_messages(db, user.id)

@router.post("/messages", response_model=MessageOut)
def send_my_message(data: MessageCreate, user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserService.send_message(db, user.id, data)

@router.get("/notifications", response_model=List[NotificationOut])
def get_my_notifications(user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserService.get_notifications(db, user.id)

@router.post("/notifications/{id}/read")
def mark_my_notification_read(id: int, user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserService.mark_notification_read(db, user.id, id)

@router.post("/notifications/read-all")
def mark_all_my_notifications_read(user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserService.mark_all_notifications_read(db, user.id)

@router.post("/contact", response_model=ContactOut)
def submit_contact_canonical(data: ContactCreate, db: Session = Depends(get_db)):
    return UserService.submit_contact(db, data)



