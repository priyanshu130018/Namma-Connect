"""Role-Based Access Control (RBAC) dependencies."""

from typing import List, Union
from fastapi import Depends, HTTPException, status
from app.dependencies.auth import get_current_user
from app.models.user import User


ROLE_NORMALIZATION = {
    "user": "user",
    "customer": "user",
    "provider": "provider",
    "partner": "provider",
    "farmer": "provider",
    "creator": "provider",
    "admin": "admin",
    "support": "admin",
}


class RoleChecker:
    """RBAC dependency checking if the user holds one of the allowed canonical roles."""

    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = [r.lower() for r in allowed_roles]

    def __call__(self, user: Union[User, dict] = Depends(get_current_user)) -> Union[User, dict]:
        user_role = user.role if isinstance(user, User) else user.get("role")
        user_role_lower = (user_role or "user").lower()
        normalized_role = ROLE_NORMALIZATION.get(user_role_lower, user_role_lower)
        if normalized_role not in self.allowed_roles and normalized_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {self.allowed_roles}",
            )
        return user


require_user = RoleChecker(["user", "provider", "admin"])
require_customer = require_user
require_provider = RoleChecker(["provider", "admin"])
require_partner = require_provider
require_admin = RoleChecker(["admin"])
