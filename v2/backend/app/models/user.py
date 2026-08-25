"""User database model."""

import uuid
from sqlalchemy import Boolean, Column, String
from app.models.base import Base, GUID, TimestampMixin


class User(Base, TimestampMixin):
    """User account model supporting customers, partners/farmers, creators, and admins."""

    __tablename__ = "users"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=False)
    mobile = Column(String(32), unique=True, index=True, nullable=True)
    role = Column(String(32), default="customer", nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    phone_verified = Column(Boolean, default=False, nullable=False)
    auth_provider = Column(String(32), default="local", nullable=False)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    avatar_url = Column(String(512), nullable=True)
    location = Column(String(255), nullable=True, default="Bengaluru, Karnataka")
    language = Column(String(64), nullable=False, default="English, Kannada")
    theme_preference = Column(String(32), nullable=False, default="system")
    notification_preferences = Column(String(1024), nullable=True, default='{"email": true, "sms": true, "promo": false, "bookings": true, "payments": true, "collaborations": true, "support": true}')
    privacy_preferences = Column(String(512), nullable=True, default='{"share_profile": true, "personalize_location": true}')
    is_test_data = Column(Boolean, default=False, nullable=False, index=True)
