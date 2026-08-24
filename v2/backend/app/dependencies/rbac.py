"""Role-Based Access Control (RBAC) dependencies."""

from typing import List, Union
from fastapi import Depends, HTTPException, status
from app.dependencies.auth import get_current_user
from app.models.user import User


class RoleChecker:
    """RBAC dependency checking if the user holds one of the allowed roles."""

    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = [r.lower() for r in allowed_roles]

    def __call__(self, user: Union[User, dict] = Depends(get_current_user)) -> Union[User, dict]:
        user_role = user.role if isinstance(user, User) else user.get("role")
        user_role_lower = (user_role or "customer").lower()
        if user_role_lower not in self.allowed_roles and user_role_lower != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {self.allowed_roles}",
            )
        return user


require_customer = RoleChecker(["customer", "user", "tourist"])
require_partner = RoleChecker(["partner", "farmer", "hotel", "guide", "driver"])
require_creator = RoleChecker(["creator"])
require_admin = RoleChecker(["admin"])
