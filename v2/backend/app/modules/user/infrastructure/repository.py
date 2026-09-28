"""User module infrastructure repository."""

from typing import Optional
from sqlalchemy.orm import Session
from app.modules.user.domain.models import User


class UserRepository:
    """Repository for user entity operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email.strip().lower()).first()

    def update(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
