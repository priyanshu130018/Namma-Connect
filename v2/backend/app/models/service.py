"""Service and Review SQLAlchemy Models for Marketplace Discovery."""

import uuid
from typing import Optional, List
from sqlalchemy import Column, String, Text, Float, Integer, Boolean, ForeignKey, Index, DateTime
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.models.base import Base, TimestampMixin, GUID


class Service(Base, TimestampMixin):
    """Authoritative Marketplace Service Model."""

    __tablename__ = "services"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False, index=True)  # experiences, guides-tours, travel-services, stay, food, events
    category_slug = Column(String(100), nullable=False, index=True)

    location = Column(String(255), nullable=False, index=True)
    district = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False, default="Karnataka")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    price = Column(Float, nullable=False)  # Starting price in INR
    unit = Column(String(50), nullable=False, default="night")  # night, person, tour, session
    duration_hours = Column(Float, nullable=True)
    max_capacity = Column(Integer, nullable=True, default=10)

    rating = Column(Float, nullable=False, default=5.0)
    reviews_count = Column(Integer, nullable=False, default=0)

    is_verified = Column(Boolean, nullable=False, default=True)
    status = Column(String(50), nullable=False, default="PENDING", index=True)  # PENDING, PUBLISHED, REJECTED, REMOVED

    # Provider metadata
    provider_id = Column(GUID(), nullable=True, index=True)
    provider_name = Column(String(255), nullable=False)
    provider_type = Column(String(100), nullable=False, default="Farmer")
    provider_avatar = Column(String(500), nullable=True)

    # Moderation & Review metadata
    rejection_reason = Column(Text, nullable=True)
    reviewed_by = Column(GUID(), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Media & Details
    primary_image = Column(String(500), nullable=False)
    images_json = Column(Text, nullable=False, default="[]")  # JSON-encoded image list
    inclusions_json = Column(Text, nullable=False, default="[]")  # JSON-encoded inclusions list
    amenities_json = Column(Text, nullable=False, default="[]")  # JSON-encoded amenities list

    # Vector Embedding for Semantic Search (768-dim Gemini embedding)
    embedding = Column(Vector(768), nullable=True)

    # Development/Synthetic test data indicator
    is_test_data = Column(Boolean, nullable=False, default=False, index=True)

    # Relationships
    reviews = relationship("Review", back_populates="service", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_service_search", "category_slug", "status", "price"),
    )


class Review(Base, TimestampMixin):
    """Customer Review for a Marketplace Service."""

    __tablename__ = "reviews"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    service_id = Column(GUID(), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_id = Column(GUID(), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True, unique=True, index=True)
    user_id = Column(GUID(), nullable=True, index=True)
    user_name = Column(String(255), nullable=False)
    rating = Column(Float, nullable=False, default=5.0)
    comment = Column(Text, nullable=False)
    is_verified = Column(Boolean, nullable=False, default=True)
    status = Column(String(50), nullable=False, default="PUBLISHED")
    is_test_data = Column(Boolean, nullable=False, default=False, index=True)

    service = relationship("Service", back_populates="reviews")
