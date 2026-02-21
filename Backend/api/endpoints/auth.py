from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from passlib.context import CryptContext

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

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


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
        password_hash=hash_password(req.password),
        name=req.name,
        mobile=req.mobile,
        role="tourist"
    )
    db.add(login)
    db.flush()

    tourist = Tourist(
        login_id=login.id,
        name=req.name,
        mobile=req.mobile
    )
    db.add(tourist)
    db.commit()
    db.refresh(login)
    db.refresh(tourist)

    token = create_token({"sub": str(login.id), "role": "tourist"})
    return TokenResponse(
        access_token=token,
        user_id=tourist.id,
        login_id=login.id,
        role="tourist",
        name=tourist.name,
        email=login.email,
        mobile=login.mobile,
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):

    # Find by email OR mobile
    login_obj = db.query(Login).filter(
        (Login.email == req.identifier) |
        (Login.mobile == req.identifier)
    ).first()

    if not login_obj or not verify_password(req.password, login_obj.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email/mobile or password")

    role = login_obj.role
    name = ""
    user_id = login_obj.id

    if role == "tourist" and login_obj.tourist:
        name = login_obj.tourist.name
        user_id = login_obj.tourist.id
    elif role == "creator" and login_obj.creator:
        name = login_obj.creator.name
        user_id = login_obj.creator.id
    elif role == "farmer" and login_obj.farmer:
        name = login_obj.farmer.name
        user_id = login_obj.farmer.id

    token = create_token({"sub": str(login_obj.id), "role": role})

    return TokenResponse(
        access_token=token,
        user_id=user_id,
        login_id=login_obj.id,
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
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

    # Find or create user
    login_obj = db.query(Login).filter(Login.email == email).first()
    if not login_obj:
        # Create new login
        login_obj = Login(
            email=email, 
            password_hash="google-auth", 
            name=name,
            mobile=None,
            role="tourist"
        )

        db.add(login_obj)
        db.flush()
        # Create tourist profile
        tourist = Tourist(login_id=login_obj.id, name=name)
        db.add(tourist)
        db.commit()
        db.refresh(login_obj)
        db.refresh(tourist)
    
    # Get role-specific ID
    user_id = login_obj.id
    role = login_obj.role
    if role == "tourist" and login_obj.tourist:
        user_id = login_obj.tourist.id
    elif role == "creator" and login_obj.creator:
        user_id = login_obj.creator.id
    elif role == "farmer" and login_obj.farmer:
        user_id = login_obj.farmer.id

    token = create_token({"sub": str(login_obj.id), "role": role})
    return TokenResponse(
        access_token=token,
        user_id=user_id,
        login_id=login_obj.id,
        role=role,
        name=name,
        email=login_obj.email,
        mobile=login_obj.mobile,
    )


@router.get("/me")
def me(token: str, db: Session = Depends(get_db)):
    try:
        payload = decode_token(token)
        login_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    login_obj = db.query(Login).filter(Login.id == login_id).first()
    if not login_obj:
        raise HTTPException(status_code=404, detail="User not found")

    return {"login_id": login_id, "email": login_obj.email, "role": login_obj.role}


@router.post("/change-password")
def change_password(req: ChangePasswordRequest, db: Session = Depends(get_db)):
    # Find by email OR mobile
    login_obj = db.query(Login).filter(
        (Login.email == req.identifier) |
        (Login.mobile == req.identifier)
    ).first()

    if not login_obj:
        raise HTTPException(status_code=404, detail="User not found with provided email/mobile")
    
    login_obj.password_hash = hash_password(req.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
