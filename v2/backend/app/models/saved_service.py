"""Saved Service (Wishlist) SQLAlchemy Model."""

import uuid
from sqlalchemy import Column, Boolean, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin, GUID


class SavedService(Base, TimestampMixin):
    """Customer Saved Service (Bookmark/Wishlist) Model."""

    __tablename__ = "saved_services"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(GUID(), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    is_test_data = Column(Boolean, nullable=False, default=False, index=True)

    # Relationships
    user = relationship("User", backref="saved_services")
    service = relationship("Service", backref="saved_by_users")

    __table_args__ = (
        UniqueConstraint("user_id", "service_id", name="uq_user_saved_service"),
        Index("idx_user_saved_services", "user_id", "created_at"),
    )
