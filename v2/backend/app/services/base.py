"""Base service layer abstraction."""

from sqlalchemy.orm import Session

class BaseService:
    """Base domain service providing transaction and database management."""

    def __init__(self, db: Session):
        self.db = db
