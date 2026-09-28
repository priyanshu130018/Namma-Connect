"""Review Domain Model for Marketplace Experience Feedback."""

import uuid
from sqlalchemy import (
    Boolean,
    Column,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.models.base import Base, GUID, TimestampMixin
from app.core.enums import ReviewStatus


class Review(Base, TimestampMixin):
    """Customer Review for a Marketplace Service."""

    __tablename__ = "reviews"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    service_id = Column(GUID(), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_id = Column(GUID(), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True, unique=True, index=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_name = Column(String(255), nullable=False)

    rating = Column(Float, nullable=False, default=5.0)
    comment = Column(Text, nullable=False)
    is_verified = Column(Boolean, nullable=False, default=True)
    status = Column(String(50), nullable=False, default=ReviewStatus.PUBLISHED.value)
    is_test_data = Column(Boolean, nullable=False, default=False, index=True)

    # Relationships
    service = relationship("Service", back_populates="reviews")
    booking = relationship("Booking", back_populates="review")
    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("idx_service_reviews", "service_id", "status", "rating"),
    )
