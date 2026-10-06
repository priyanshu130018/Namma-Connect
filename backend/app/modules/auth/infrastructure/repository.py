"""Auth module infrastructure repository."""

from typing import Optional
from sqlalchemy.orm import Session
from app.modules.user.domain.models import User
from app.models.base import GUID


class AuthRepository:
    """Data access repository for user authentication entities."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email.strip().lower()).first()

    def get_by_id(self, user_id) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_mobile(self, mobile: str) -> Optional[User]:
        return self.db.query(User).filter(User.mobile == mobile.strip()).first()

    def get_by_google_id(self, google_id: str) -> Optional[User]:
        return self.db.query(User).filter(User.google_id == google_id).first()

    def save(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
