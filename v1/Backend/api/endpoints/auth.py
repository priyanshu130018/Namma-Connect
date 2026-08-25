from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import bcrypt as _bcrypt_lib

from jose import jwt
from datetime import datetime, timedelta
from api.endpoints.config import SECRET_KEY

from google.auth.transport import requests
from google.oauth2 import id_token
from api.endpoints.config import GOOGLE_CLIENT_ID

from db.database import get_db
from db.models import Login, Tourist
from db.schemas import RegisterRequest, LoginRequest, TokenResponse, ChangePasswordRequest


router = APIRouter()

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def hash_password(pw: str) -> str:
    return _bcrypt_lib.hashpw(pw.encode("utf-8"), _bcrypt_lib.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt_lib.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = (
        db.query(Login)
        .filter(
            (Login.email == req.email) | (Login.mobile == req.mobile)
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email or mobile already registered. Please log in instead.",
        )

    login = Login(
        email=req.email,
        password=hash_password(req.password),
        full_name=req.full_name,
        mobile=req.mobile,
        role="tourist"
    )
    db.add(login)
    db.flush()

    tourist = Tourist(
        user_id=login.id,
        name=req.full_name,
        mobile=req.mobile
    )
    db.add(tourist)
    db.commit()
    db.refresh(login)
    db.refresh(tourist)

    token = create_token({"sub": str(login.id), "role": "tourist"})
    return TokenResponse(
        access_token=token,
        profile_id=tourist.id,
        user_id=login.id,
        role="tourist",
        name=tourist.name,
        email=login.email,
        mobile=login.mobile,
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    from sqlalchemy import func
    identifier = req.identifier.strip()

    # Find by email OR mobile
    login_obj = db.query(Login).filter(
        (func.lower(Login.email) == identifier.lower()) |
        (Login.mobile == identifier)
    ).first()

    if not login_obj:
        raise HTTPException(
            status_code=401,
            detail="Account not found"
        )

    if not verify_password(req.password, login_obj.password):
        raise HTTPException(
            status_code=401,
            detail="Password is incorrect"
        )

    role = login_obj.role
    name = ""
    profile_id = login_obj.id

    if role == "tourist" and login_obj.tourist:
        name = login_obj.tourist.name
        profile_id = login_obj.tourist.id
    elif role == "creator" and login_obj.creator:
        name = login_obj.creator.name
        profile_id = login_obj.creator.id
    elif role == "farmer" and login_obj.farmer:
        name = login_obj.farmer.name
        profile_id = login_obj.farmer.id
    elif role == "admin":
        # Admin has no profile table — use the Login name directly
        name = login_obj.full_name
        profile_id = login_obj.id

    token = create_token({"sub": str(login_obj.id), "role": role})

    return TokenResponse(
        access_token=token,
        profile_id=profile_id,
        user_id=login_obj.id,
        role=role,
        name=name,
        email=login_obj.email,
        mobile=login_obj.mobile,
    )


@router.post("/google", response_model=TokenResponse)
def google_login(credential: str = Query(...), db: Session = Depends(get_db)):
    try:
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(credential, requests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo["email"]
        name = idinfo.get("name", "")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google authentication")

    # Find or create user
    login_obj = db.query(Login).filter(Login.email == email).first()
    if not login_obj:
        # Create new login
        login_obj = Login(
            email=email, 
            password="google-auth", 
            full_name=name,
            mobile=None,
            role="tourist"
        )

        db.add(login_obj)
        db.flush()
        # Create tourist profile
        tourist = Tourist(user_id=login_obj.id, name=name)
        db.add(tourist)
        db.commit()
        db.refresh(login_obj)
        db.refresh(tourist)
    
    # Get role-specific ID
    profile_id = login_obj.id
    role = login_obj.role
    if role == "tourist" and login_obj.tourist:
        profile_id = login_obj.tourist.id
    elif role == "creator" and login_obj.creator:
        profile_id = login_obj.creator.id
    elif role == "farmer" and login_obj.farmer:
        profile_id = login_obj.farmer.id

    token = create_token({"sub": str(login_obj.id), "role": role})
    return TokenResponse(
        access_token=token,
        profile_id=profile_id,
        user_id=login_obj.id,
        role=role,
        name=name,
        email=login_obj.email,
        mobile=login_obj.mobile,
    )


@router.get("/me")
def me(token: str, db: Session = Depends(get_db)):
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    login_obj = db.query(Login).filter(Login.id == user_id).first()
    if not login_obj:
        raise HTTPException(status_code=404, detail="User not found")

    return {"user_id": user_id, "email": login_obj.email, "role": login_obj.role}


@router.post("/change-password")
def change_password(req: ChangePasswordRequest, db: Session = Depends(get_db)):
    from sqlalchemy import func
    identifier = req.identifier.strip()
    # Find by email OR mobile
    login_obj = db.query(Login).filter(
        (func.lower(Login.email) == identifier.lower()) |
        (Login.mobile == identifier)
    ).first()

    if not login_obj:
        raise HTTPException(status_code=404, detail="User not found with provided email/mobile")
    
    login_obj.password = hash_password(req.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.post("/change-password/{user_id}")
def change_password_authenticated(user_id: int, req: ChangePasswordRequest, db: Session = Depends(get_db)):
    """Change password for an authenticated user using their user_id."""
    login_obj = db.query(Login).filter(Login.id == user_id).first()
    if not login_obj:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(req.identifier, login_obj.password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    login_obj.password = hash_password(req.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.delete("/delete-account/{user_id}")
def delete_account(user_id: int, db: Session = Depends(get_db)):
    """Permanently delete a user account and all associated data."""
    from db.models import Farmer, Creator, Tourist, FarmListing, Booking

    login_obj = db.query(Login).filter(Login.id == user_id).first()
    if not login_obj:
        raise HTTPException(status_code=404, detail="Account not found")

    role = login_obj.role

    # Delete all bookings made by this user (as tourist)
    tourist_profile = db.query(Tourist).filter(Tourist.user_id == user_id).first()
    if tourist_profile:
        db.query(Booking).filter(Booking.tourist_id == tourist_profile.id).delete()

    if role == "farmer":
        farmer = db.query(Farmer).filter(Farmer.user_id == user_id).first()
        if farmer:
            # Delete all farm listings (cascade should handle it, but explicit is safer)
            db.query(FarmListing).filter(FarmListing.farmer_id == farmer.id).delete()
            # Delete bookings for any listing owned by this farmer
            listing_ids = [l.id for l in db.query(FarmListing).filter(FarmListing.farmer_id == farmer.id).all()]
            if listing_ids:
                db.query(Booking).filter(Booking.farm_id.in_(listing_ids), Booking.booking_type == "farm").delete()
            db.delete(farmer)

    elif role == "creator":
        creator = db.query(Creator).filter(Creator.user_id == user_id).first()
        if creator:
            # Delete creator bookings
            db.query(Booking).filter(Booking.creator_id == creator.id, Booking.booking_type == "creator").delete()
            db.delete(creator)

    elif role == "tourist":
        tourist = db.query(Tourist).filter(Tourist.user_id == user_id).first()
        if tourist:
            db.delete(tourist)

    db.delete(login_obj)
    db.commit()
    return {"message": "Account deleted successfully"}
