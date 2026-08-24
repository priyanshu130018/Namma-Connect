"""Authentication dependencies and JWT resolver."""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.dependencies.database import get_db
from app.models.user import User
from app.repositories.user import UserRepository

security = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Optional JWT token resolver returning active User entity or None."""
    if not credentials:
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        token_type = payload.get("type")
        if token_type == "refresh":
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = UserRepository.get_by_id(db, user_id)
        if user and user.is_active:
            return user
        return None
    except JWTError:
        return None


async def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    """Required JWT authentication dependency."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access this resource",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_partner(
    user: User = Depends(get_current_user),
) -> User:
    """Ensure authenticated user has provider/farmer/creator/admin role."""
    allowed_roles = ["partner", "farmer", "creator", "admin"]
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Provider role required to access this resource.",
        )
    return user


async def require_admin(
    user: User = Depends(get_current_user),
) -> User:
    """Ensure authenticated user has admin role."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to access this resource.",
        )
    return user
