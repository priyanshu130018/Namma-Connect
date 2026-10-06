"""Provider & Partner Application domain database models."""

import uuid
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from app.models.base import Base, GUID, TimestampMixin
from app.core.enums import ApplicationStatus, PartnerRoleType


class PartnerApplication(Base, TimestampMixin):
    """Host onboarding & KYC verification application model across partner categories."""

    __tablename__ = "partner_applications"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    application_code = Column(String(32), unique=True, nullable=False, index=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Role Category
    role_type = Column(String(50), nullable=False, index=True, default=PartnerRoleType.FARMER.value)

    # Personal Information
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    mobile = Column(String(32), nullable=False)
    address = Column(String(500), nullable=False)
    district = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False, default="Karnataka")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Hosting Business Details
    business_name = Column(String(255), nullable=False)
    experience_years = Column(Integer, nullable=True, default=0)
    bio = Column(Text, nullable=True)
    languages = Column(String(255), nullable=True)

    # KYC & Verification
    id_type = Column(String(50), nullable=False)  # Aadhaar, PAN, Land_RTC, Guide_License, Commercial_DL
    id_number = Column(String(100), nullable=False)
    document_url = Column(String(500), nullable=True)

    # Offerings & Rich Details
    provider_details_json = Column(Text, nullable=True, default="{}")
    documents_json = Column(Text, nullable=True, default="[]")
    images_json = Column(Text, nullable=True, default="[]")
    services_json = Column(Text, nullable=False, default="[]")
    activities_json = Column(Text, nullable=False, default="[]")

    # Lifecycle State
    draft_step = Column(Integer, nullable=True, default=1)
    status = Column(String(50), nullable=False, default=ApplicationStatus.PENDING.value, index=True)
    rejection_reason = Column(Text, nullable=True)
    reviewed_by = Column(GUID(), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    is_test_data = Column(Boolean, nullable=False, default=False, index=True)

    # Relationships
    user = relationship("User", backref="partner_applications")
