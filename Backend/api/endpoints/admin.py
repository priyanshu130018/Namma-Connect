"""
Admin API endpoints — /admin/*

Provides:
  GET  /admin/users           — all users with role counts
  GET  /admin/user/{user_id}  — full user detail
  DELETE /admin/user/{user_id} — hard delete user + all related data
  PUT  /admin/user/{user_id}/verify — flip is_verified on profile
  GET  /admin/bookings        — all bookings with joined party info
  GET  /admin/stats           — counts summary (users / bookings / farms)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from db.database import get_db
from db.models import Login, Tourist, Creator, Farmer, FarmListing, Booking

router = APIRouter()


def _safe_str(v) -> Optional[str]:
    return str(v) if v is not None else None


# ── helpers ──────────────────────────────────────────────────────────────────

def _user_row(user: Login) -> dict:
    profile = None
    if user.role == "tourist" and user.tourist:
        profile = {
            "name": user.tourist.name,
            "mobile": user.tourist.mobile,
            "email": user.tourist.email,
            "city": user.tourist.city,
            "state": user.tourist.state,
            "aadhaar_no": user.tourist.aadhaar_no,
            "is_verified": user.tourist.is_verified,
            "profile_id": user.tourist.id,
        }
    elif user.role == "farmer" and user.farmer:
        profile = {
            "name": user.farmer.name,
            "mobile": user.farmer.mobile,
            "email": user.farmer.email,
            "city": user.farmer.city,
            "state": user.farmer.state,
            "aadhaar_no": user.farmer.aadhaar_no,
            "is_verified": user.farmer.is_verified,
            "profile_id": user.farmer.id,
            "identity_proof": user.farmer.identity_proof,
        }
    elif user.role == "creator" and user.creator:
        profile = {
            "name": user.creator.name,
            "mobile": user.creator.mobile,
            "email": user.creator.email,
            "city": user.creator.city,
            "state": user.creator.state,
            "aadhaar_no": user.creator.aadhaar_no,
            "is_verified": user.creator.is_verified,
            "profile_id": user.creator.id,
            "niche": user.creator.niche,
            "portfolio": user.creator.portfolio,
        }

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "mobile": user.mobile,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": _safe_str(user.created_at),
        "profile": profile,
    }


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get("/admin/stats")
def admin_stats(db: Session = Depends(get_db)):
    """Quick counts for dashboard widgets."""
    total   = db.query(Login).count()
    farmers  = db.query(Login).filter(Login.role == "farmer").count()
    creators = db.query(Login).filter(Login.role == "creator").count()
    tourists = db.query(Login).filter(Login.role == "tourist").count()
    bookings = db.query(Booking).count()
    farms    = db.query(FarmListing).count()
    pending  = db.query(Booking).filter(Booking.status == "pending").count()
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


@router.get("/admin/users")
def list_all_users(
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Paginated, filterable list of all users."""
    q = db.query(Login)
    if role and role != "all":
        q = q.filter(Login.role == role)
    if search:
        term = f"%{search}%"
        q = q.filter(
            (Login.full_name.ilike(term)) |
            (Login.email.ilike(term)) |
            (Login.mobile.ilike(term))
        )
    total = q.count()
    users = q.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "users": [_user_row(u) for u in users],
    }


@router.get("/admin/user/{user_id}")
def get_user_detail(user_id: int, db: Session = Depends(get_db)):
    """Full user detail including role-specific profile."""
    user = db.query(Login).filter(Login.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_row(user)


@router.delete("/admin/user/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Hard-delete a user and cascade their profile data."""
    user = db.query(Login).filter(Login.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": f"User {user_id} deleted successfully."}


@router.put("/admin/user/{user_id}/verify")
def verify_user(user_id: int, db: Session = Depends(get_db)):
    """Toggle is_verified on a user's profile (farmer/creator/tourist)."""
    user = db.query(Login).filter(Login.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = user.farmer or user.creator or user.tourist
    if not profile:
        raise HTTPException(status_code=400, detail="No profile found to verify")

    profile.is_verified = not profile.is_verified
    db.commit()
    return {
        "user_id": user_id,
        "is_verified": profile.is_verified,
        "message": "Verified" if profile.is_verified else "Unverified",
    }


@router.get("/admin/bookings")
def list_all_bookings(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """All bookings with tourist / farm / creator info joined."""
    q = db.query(Booking)
    if status and status != "all":
        q = q.filter(Booking.status == status)

    total    = q.count()
    bookings = q.order_by(Booking.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    rows = []
    for b in bookings:
        tourist_name = b.tourist.name if b.tourist else "Unknown"
        farm_name    = b.farm.farm_name if b.farm else None
        creator_name = b.creator.name if b.creator else None
        rows.append({
            "id": b.id,
            "tourist_name": tourist_name,
            "booking_type": b.booking_type,
            "farm_name": farm_name,
            "creator_name": creator_name,
            "check_in": _safe_str(b.check_in),
            "check_out": _safe_str(b.check_out),
            "guests": b.guests,
            "total_price": float(b.total_price) if b.total_price else 0,
            "status": b.status,
            "collab_note": b.collab_note,
            "created_at": _safe_str(b.created_at),
        })

    return {"total": total, "page": page, "page_size": page_size, "bookings": rows}
