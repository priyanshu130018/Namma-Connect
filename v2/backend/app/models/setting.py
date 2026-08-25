"""Platform Settings database model for administrative configuration."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from app.models.base import Base


class PlatformSetting(Base):
    """Authoritative Platform Configuration Key-Value Store."""

    __tablename__ = "platform_settings"

    key = Column(String(64), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
