"""Partner Application model for progressive host onboarding and verification."""

import uuid
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship

from app.models.base import Base, GUID, TimestampMixin


class PartnerApplication(Base, TimestampMixin):
    """Stores host onboarding applications across partner roles."""

    __tablename__ = "partner_applications"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    application_code = Column(String(32), unique=True, nullable=False, index=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Role Category
    role_type = Column(String(50), nullable=False, index=True)  # farmer, guide, travel, hotel, creator, artisan, homestay, event

    # Personal Information
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    mobile = Column(String(32), nullable=False)
    address = Column(String(500), nullable=False)
    district = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False, default="Karnataka")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Professional Hosting Details
    business_name = Column(String(255), nullable=False)
    experience_years = Column(Integer, nullable=True, default=0)
    bio = Column(Text, nullable=True)
    languages = Column(String(255), nullable=True)

    # KYC & Verification
    id_type = Column(String(50), nullable=False)  # Aadhaar, PAN, Land_RTC, Guide_License, Commercial_DL
    id_number = Column(String(100), nullable=False)
    document_url = Column(String(500), nullable=True)

    # Offerings (Dynamic Tags)
    services_json = Column(Text, nullable=False, default="[]")  # list of custom/standard services
    activities_json = Column(Text, nullable=False, default="[]")  # list of custom/standard activities

    # Lifecycle State
    status = Column(String(50), nullable=False, default="PENDING", index=True)  # DRAFT, PENDING, REJECTED, APPROVED
    rejection_reason = Column(Text, nullable=True)
    reviewed_by = Column(GUID(), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Relationship to user
    user = relationship("User", backref="partner_applications", lazy="joined")
