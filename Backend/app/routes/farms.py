from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date as DateType

from app.core.database import get_db
from app.services.farm_service import FarmService
from app.schemas.farm import FarmListingCreate, FarmListingOut
from app.dependencies.auth import get_current_user, get_current_farmer
from app.models.user import Login

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# CANONICAL FARMS ENDPOINTS (PREFIXED WITH /api)
# ─────────────────────────────────────────────────────────────

@router.get("/farms")
def list_farms_new(
    page: Optional[int] = Query(None, ge=1),
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    if page is not None:
        skip = (page - 1) * limit
    return FarmService.list_all_farms(db, skip, limit)

@router.get("/farms/{id}", response_model=FarmListingOut)
def get_farm_new(id: int, db: Session = Depends(get_db)):
    return FarmService.get_farm_listing(db, id)

@router.post("/farms", response_model=FarmListingOut)
def create_farm_new(
    data: FarmListingCreate,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    # Verifies they have an approved farmer profile before publishing
    return FarmService.create_farm_listing(db, current_user.id, data)

@router.patch("/farms/{id}", response_model=FarmListingOut)
def update_farm_new(
    id: int,
    data: FarmListingCreate,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    # Verify ownership
    f = FarmService.get_farm_listing(db, id)
    if not f.farmer_profile or f.farmer_profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this listing")
    return FarmService.update_farm_listing(db, id, data)

@router.delete("/farms/{id}")
def delete_farm_new(
    id: int,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    return FarmService.delete_farm_listing(db, id, current_user.id)

@router.get("/search")
def search_unified_canonical(
    type: Optional[str] = Query("farm"),
    query: Optional[str] = Query(None),
    date_start: Optional[DateType] = Query(None),
    date_end: Optional[DateType] = Query(None),
    time_slot: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # Unified search endpoint supporting type=farm, type=creator, or type=all
    search_type = (type or "farm").lower()
    if search_type == "creator":
        from app.services.user_service import UserService
        return UserService.search_creators(db, query, date_start, date_end)
    elif search_type == "all":
        from app.services.user_service import UserService
        farms = FarmService.search_farms(db, 0, query, date_start, date_end, time_slot)
        creators = UserService.search_creators(db, query, date_start, date_end)
        return {"farms": farms, "creators": creators}
    else:
        return FarmService.search_farms(db, 0, query, date_start, date_end, time_slot)


