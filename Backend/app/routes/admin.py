from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.models.user import Login, FarmerProfile, CreatorProfile, Application, VerificationDocument
from app.models.farm import FarmListing
from app.models.booking import Booking
from app.models.collaboration import Collaboration
from app.services.application_service import ApplicationService
from app.dependencies.auth import get_current_admin
from app.schemas.user import ApplicationOut

router = APIRouter()

def _safe_str(v) -> Optional[str]:
    return str(v) if v is not None else None

def _user_row(user: Login) -> dict:
    role = "tourist"
    if user.email.startswith("admin"):
        role = "admin"
    elif user.farmer_profile and user.farmer_profile.verification_status == "approved":
        role = "farmer"
    elif user.creator_profile and user.creator_profile.verification_status == "approved":
        role = "creator"

    profile = None
    if user.profile:
        profile = {
            "name": user.name,
            "mobile": user.mobile,
            "email": user.email,
            "city": user.profile.city,
            "state": user.profile.state,
            "is_verified": True,
            "profile_id": user.profile.id,
        }

    return {
        "id": user.id,
        "full_name": user.name,
        "email": user.email,
        "mobile": user.mobile,
        "role": role,
        "is_active": user.is_active,
        "created_at": _safe_str(user.created_at),
        "profile": profile,
    }

# ─────────────────────────────────────────────────────────────
# CANONICAL ADMIN ENDPOINTS (PREFIXED WITH /api/admin)
# ─────────────────────────────────────────────────────────────

@router.get("/admin/users")
def list_all_users_new(
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: Login = Depends(get_current_admin)
):
    q = db.query(Login)
    # Search is supported
    if search:
        term = f"%{search}%"
        q = q.filter(
            (Login.name.ilike(term)) |
            (Login.email.ilike(term)) |
            (Login.mobile.ilike(term))
        )
    
    total = q.count()
    users = q.offset((page - 1) * page_size).limit(page_size).all()
    
    # Filter by computed role if requested
    user_rows = [_user_row(u) for u in users]
    if role and role != "all":
        user_rows = [r for r in user_rows if r["role"] == role]
        total = len(user_rows)

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "users": user_rows,
    }

@router.get("/admin/applications", response_model=List[ApplicationOut])
def list_applications(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: Login = Depends(get_current_admin)
):
    q = db.query(Application)
    if status:
        q = q.filter(Application.status == status)
    return q.order_by(Application.submitted_at.desc()).all()

@router.get("/admin/applications/{id}", response_model=ApplicationOut)
def get_application(
    id: int,
    db: Session = Depends(get_db),
    admin: Login = Depends(get_current_admin)
):
    return ApplicationService.get_application(db, id)

@router.patch("/admin/applications/{id}")
def review_application(
    id: int,
    status: str = Body(..., embed=True),
    rejection_reason: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
    admin: Login = Depends(get_current_admin)
):
    return ApplicationService.review_application(db, admin.id, id, status, rejection_reason)

# ─────────────────────────────────────────────────────────────
# LEGACY COMPATIBILITY ROUTING (UNDER /api PREFIX)
# ─────────────────────────────────────────────────────────────

@router.delete("/admin/users/{id}")
def delete_user(id: int, db: Session = Depends(get_db), admin: Login = Depends(get_current_admin)):
    user = db.query(Login).filter(Login.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": f"User {id} deleted successfully."}

@router.get("/admin/stats")
def admin_stats(db: Session = Depends(get_db), admin: Login = Depends(get_current_admin)):
    total = db.query(Login).count()
    farmers = db.query(FarmerProfile).filter(FarmerProfile.verification_status == "approved").count()
    creators = db.query(CreatorProfile).filter(CreatorProfile.verification_status == "approved").count()
    
    # Tourists are users who aren't approved farmer or creator
    tourists = total - (farmers + creators)
    bookings = db.query(Booking).count()
    farms = db.query(FarmListing).count()
    pending = db.query(Booking).filter(Booking.status == "pending").count()
    confirmed = db.query(Booking).filter(Booking.status == "confirmed").count()
    
    return {
        "total_users": total,
        "farmers": farmers,
        "creators": creators,
        "tourists": tourists,
        "total_bookings": bookings,
        "total_farms": farms,
        "pending_bookings": pending,
        "confirmed_bookings": confirmed,
    }

@router.get("/admin/bookings")
def list_all_bookings_legacy(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: Login = Depends(get_current_admin)
):
    q = db.query(Booking)
    if status and status != "all":
        q = q.filter(Booking.status == status)

    total = q.count()
    bookings = q.order_by(Booking.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    rows = []
    for b in bookings:
        tourist_name = b.contact_name
        farm_name = b.farm.name if b.farm else None
        
        rows.append({
            "id": b.id,
            "tourist_name": tourist_name,
            "booking_type": "farm",
            "farm_name": farm_name,
            "creator_name": None,
            "address": b.farm.address if b.farm else "Unknown",
            "check_in": _safe_str(b.booking_date),
            "check_out": _safe_str(b.check_out),
            "adults": b.guest_count,
            "children": 0,
            "guests": b.guest_count,
            "total_price": float(b.amount) if b.amount else 0,
            "status": b.status,
            "collab_note": b.special_request,
            "created_at": _safe_str(b.created_at),
        })

    return {"total": total, "page": page, "page_size": page_size, "bookings": rows}
