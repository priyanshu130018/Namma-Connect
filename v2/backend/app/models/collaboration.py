"""Collaboration SQLAlchemy Model."""

import uuid
from sqlalchemy import Column, String, Text, Float, ForeignKey, Index
from app.models.base import Base, TimestampMixin, GUID


class Collaboration(Base, TimestampMixin):
    """Authoritative Collaboration Deal between Host/Partner and Creator."""

    __tablename__ = "collaborations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    collaboration_code = Column(String(50), nullable=False, unique=True, index=True)

    creator_id = Column(GUID(), ForeignKey("users.id"), nullable=False, index=True)
    creator_name = Column(String(255), nullable=False)
    creator_handle = Column(String(100), nullable=False)

    partner_id = Column(GUID(), ForeignKey("users.id"), nullable=False, index=True)
    partner_name = Column(String(255), nullable=False)

    campaign_title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    proposed_dates = Column(String(100), nullable=False)
    budget = Column(Float, nullable=False)
    deliverables_json = Column(Text, nullable=False, default="[]")

    # Status: PENDING, ACCEPTED, REJECTED, COMPLETED
    status = Column(String(50), nullable=False, default="PENDING", index=True)

    __table_args__ = (
        Index("idx_collab_creator_status", "creator_id", "status"),
        Index("idx_collab_partner_status", "partner_id", "status"),
    )
