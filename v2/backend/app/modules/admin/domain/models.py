"""Admin & Platform Governance Domain Models."""

import uuid
from sqlalchemy import (
    Boolean,
    Column,
    String,
    Text,
)
from app.models.base import Base, GUID, TimestampMixin


class PlatformSetting(Base, TimestampMixin):
    """Dynamic Platform Configurations, Feature Toggles, and Operational Variables."""

    __tablename__ = "platform_settings"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    is_public = Column(Boolean, nullable=False, default=False)
