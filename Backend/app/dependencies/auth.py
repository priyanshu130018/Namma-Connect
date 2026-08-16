from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import Login, FarmerProfile, CreatorProfile

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Login:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    
    user = db.query(Login).filter(Login.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_farmer(user: Login = Depends(get_current_user)) -> FarmerProfile:
    if not user.farmer_profile or user.farmer_profile.verification_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Approved Farmer profile required."
        )
    return user.farmer_profile


def get_current_creator(user: Login = Depends(get_current_user)) -> CreatorProfile:
    if not user.creator_profile or user.creator_profile.verification_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Approved Creator profile required."
        )
    return user.creator_profile


def get_current_admin(user: Login = Depends(get_current_user)) -> Login:
    if not user.email.startswith("admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required."
        )
    return user
