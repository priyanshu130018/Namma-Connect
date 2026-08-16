from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.activity import Activity
from app.models.farm import FarmListing
from app.schemas.farm import ActivityCreate, ActivityOut
from app.dependencies.auth import get_current_user
from app.models.user import Login

router = APIRouter()

@router.get("/activities", response_model=List[ActivityOut])
def get_activities(skip: int = Query(0), limit: int = Query(50), db: Session = Depends(get_db)):
    return db.query(Activity).filter(Activity.status == "active").offset(skip).limit(limit).all()

@router.post("/activities", response_model=ActivityOut)
def create_activity(
    data: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    if not data.farm_id:
        raise HTTPException(status_code=400, detail="farm_id is required")

    farm = db.query(FarmListing).filter(FarmListing.id == data.farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    # Verify ownership
    if not farm.farmer_profile or farm.farmer_profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add activities to this farm")

    act = Activity(
        farm_id=data.farm_id,
        name=data.name,
        description=data.description,
        price=data.price,
        duration_minutes=data.duration_minutes,
        capacity=data.capacity,
        status=data.status or "active"
    )
    db.add(act)
    db.commit()
    db.refresh(act)
    return act
