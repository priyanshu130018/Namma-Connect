from fastapi import Depends, HTTPException, status
from app.dependencies.auth import get_current_user
from app.models.user import Login

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: Login = Depends(get_current_user)) -> Login:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to access this resource"
            )
        return current_user
