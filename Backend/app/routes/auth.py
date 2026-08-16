from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.services.auth_service import AuthService
from app.schemas.user import RegisterRequest, LoginRequest, ChangePasswordRequest, TokenResponse, UserOut
from app.dependencies.auth import get_current_user
from app.models.user import Login
from app.dependencies.rate_limit import login_limiter

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# CANONICAL RESOURCE-BASED ENDPOINTS (PREFIXED WITH /api)
# ─────────────────────────────────────────────────────────────

@router.post("/auth/register", response_model=TokenResponse)
def register_new(req: RegisterRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    return AuthService.register(db, req, background_tasks)

@router.post("/auth/login", response_model=TokenResponse)
def login_new(req: LoginRequest, db: Session = Depends(get_db), _rate_limit = Depends(login_limiter)):
    return AuthService.login(db, req)

@router.get("/auth/me", response_model=TokenResponse)
def get_me(user: Login = Depends(get_current_user)):
    # Returns JWT TokenResponse format with profiles information
    has_farmer = user.farmer_profile is not None and user.farmer_profile.verification_status == "approved"
    has_creator = user.creator_profile is not None and user.creator_profile.verification_status == "approved"
    
    default_role = "tourist"
    if has_farmer:
        default_role = "farmer"
    elif has_creator:
        default_role = "creator"

    return TokenResponse(
        access_token="",  # Not required for check-in
        user_id=user.id,
        role=default_role,
        name=user.name,
        email=user.email,
        mobile=user.mobile,
        has_farmer_profile=has_farmer,
        has_creator_profile=has_creator,
        farmer_verification_status=user.farmer_profile.verification_status if user.farmer_profile else None,
        creator_verification_status=user.creator_profile.verification_status if user.creator_profile else None,
    )

@router.post("/auth/change-password")
def change_password(req: ChangePasswordRequest, db: Session = Depends(get_db)):
    return AuthService.change_password(db, req)

@router.post("/auth/change-password/authenticated")
def change_password_authenticated(
    req: ChangePasswordRequest,
    user: Login = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AuthService.change_password_authenticated(db, user.id, req)

@router.post("/auth/google", response_model=TokenResponse)
def google_login_new(credential: str = Query(...), db: Session = Depends(get_db)):
    return AuthService.google_login(db, credential)

@router.delete("/auth/account")
def delete_account_canonical(user: Login = Depends(get_current_user), db: Session = Depends(get_db)):
    return AuthService.delete_account(db, user.id)
