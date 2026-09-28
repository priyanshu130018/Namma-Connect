"""Marketplace Domain Models (Categories, Services, Availability, Saved Items, Translations)."""

import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.models.base import Base, GUID, TimestampMixin
from app.core.enums import MarketplaceType, ServiceStatus


class MarketplaceCategory(Base, TimestampMixin):
    """Authoritative Marketplace Taxonomy Category (Permanent entity)."""

    __tablename__ = "marketplace_categories"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    marketplace_type = Column(String(50), nullable=False, index=True, default=MarketplaceType.ACTIVITY.value)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    icon = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Relationships
    services = relationship("Service", back_populates="category_rel")


class Service(Base, TimestampMixin):
    """Authoritative Marketplace Service Listing."""

    __tablename__ = "services"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False, index=True)
    category_slug = Column(String(100), nullable=False, index=True)

    category_id = Column(GUID(), ForeignKey("marketplace_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    marketplace_type = Column(String(50), nullable=False, default=MarketplaceType.ACTIVITY.value, index=True)

    location = Column(String(255), nullable=False, index=True)
    district = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False, default="Karnataka")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    formatted_address = Column(String(500), nullable=True)

    # Financial breakdown (NUMERIC 12,2 for accurate currency values)
    price = Column(Numeric(12, 2), nullable=False)
    unit = Column(String(50), nullable=False, default="night")
    duration_hours = Column(Float, nullable=True)
    max_capacity = Column(Integer, nullable=True, default=10)

    rating = Column(Float, nullable=False, default=0.0)
    reviews_count = Column(Integer, nullable=False, default=0)

    is_verified = Column(Boolean, nullable=False, default=False)
    status = Column(String(50), nullable=False, default=ServiceStatus.PENDING.value, index=True)

    # Provider metadata
    provider_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    provider_name = Column(String(255), nullable=False)
    provider_type = Column(String(100), nullable=False, default="Farmer")
    provider_avatar = Column(String(500), nullable=True)

    # Moderation & Review metadata
    rejection_reason = Column(Text, nullable=True)
    reviewed_by = Column(GUID(), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Media & Details
    primary_image = Column(String(500), nullable=False)
    images_json = Column(Text, nullable=False, default="[]")
    inclusions_json = Column(Text, nullable=False, default="[]")
    amenities_json = Column(Text, nullable=False, default="[]")

    # Vector Embedding for Semantic Search (768-dim Gemini embedding via pgvector)
    embedding = Column(Vector(768), nullable=True)

    # Synthetic test data indicator
    is_test_data = Column(Boolean, nullable=False, default=False, index=True)

    # Relationships
    category_rel = relationship("MarketplaceCategory", back_populates="services")
    reviews = relationship("Review", back_populates="service", cascade="all, delete-orphan")
    availabilities = relationship("ServiceAvailability", back_populates="service", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_service_search", "category_slug", "status", "price"),
        Index("idx_service_location", "district", "state"),
    )


class ServiceAvailability(Base, TimestampMixin):
    """Real-time date and slot availability for marketplace services."""

    __tablename__ = "service_availabilities"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    service_id = Column(GUID(), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(32), nullable=False, index=True)  # YYYY-MM-DD
    start_time = Column(String(32), nullable=True)
    end_time = Column(String(32), nullable=True)
    slot_label = Column(String(128), nullable=True)
    capacity = Column(Integer, nullable=False, default=10)
    booked_count = Column(Integer, nullable=False, default=0)
    is_blocked = Column(Boolean, nullable=False, default=False)
    price_override = Column(Numeric(12, 2), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    service = relationship("Service", back_populates="availabilities")

    __table_args__ = (
        Index("idx_service_avail_date", "service_id", "date"),
    )


class SavedService(Base, TimestampMixin):
    """Customer Wishlist and Bookmarking for Marketplace Services."""

    __tablename__ = "saved_services"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(GUID(), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    notes = Column(Text, nullable=True)

    # Relationships
    service = relationship("Service")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "service_id", name="uq_user_saved_service"),
    )


class ContentTranslation(Base, TimestampMixin):
    """Cached Multilingual Content Translations."""

    __tablename__ = "content_translations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    resource_type = Column(String(50), nullable=False)  # service, category, etc.
    resource_id = Column(String(100), nullable=False)
    language = Column(String(10), nullable=False)  # kn, hi, etc.
    field_name = Column(String(50), nullable=False)  # title, description, etc.
    translated_text = Column(Text, nullable=False)
    source_language = Column(String(10), nullable=False, default="en")
    is_stale = Column(Boolean, nullable=False, default=False)

    __table_args__ = (
        Index("idx_translation_lookup", "resource_type", "resource_id", "language", "field_name"),
    )
