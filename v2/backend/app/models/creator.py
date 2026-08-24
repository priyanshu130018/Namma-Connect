"""Creator Profile SQLAlchemy Model."""

import uuid
from sqlalchemy import Column, String, Text, Float, Integer, Boolean, ForeignKey, Index
from app.models.base import Base, TimestampMixin, GUID


class CreatorProfile(Base, TimestampMixin):
    """Authoritative Creator Profile and Media Kit Model."""

    __tablename__ = "creator_profiles"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    display_name = Column(String(255), nullable=False)
    handle = Column(String(100), nullable=False, unique=True, index=True)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=False)
    location = Column(String(255), nullable=False)
    reach = Column(String(100), nullable=False, default="50K+ Reach")
    starting_rate = Column(Float, nullable=False, default=10000.0)
    rating = Column(Float, nullable=False, default=5.0)
    reviews_count = Column(Integer, nullable=False, default=0)
    is_verified = Column(Boolean, nullable=False, default=True)

    # JSON Serialized Fields
    specialties_json = Column(Text, nullable=False, default="[]")  # e.g. ["Drone Cinematography", "Food Stories"]
    social_links_json = Column(Text, nullable=False, default="{}")  # e.g. {"instagram": "@...", "youtube": "..."}
    portfolio_items_json = Column(Text, nullable=False, default="[]")  # List of portfolio media items
    packages_json = Column(Text, nullable=False, default="[]")  # List of fixed-price media packages

    __table_args__ = (
        Index("idx_creator_handle", "handle"),
        Index("idx_creator_verified", "is_verified"),
    )
