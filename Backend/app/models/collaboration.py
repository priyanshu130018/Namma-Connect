from sqlalchemy import Column, Integer, String, Text, ForeignKey, Date, Time, Numeric, TIMESTAMP, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Collaboration(Base):
    __tablename__ = "collaborations"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("creator_profiles.id"), nullable=False)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    initiated_by = Column(String(20), nullable=False)  # farmer, creator
    message = Column(Text, nullable=True)
    proposal = Column(Text, nullable=True)
    requested_date = Column(Date, nullable=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    amount = Column(Numeric(12, 2), nullable=True)
    currency = Column(String(10), default="INR")
    status = Column(String(30), nullable=False, default="requested")  # requested, accepted, rejected, payment_pending, paid, active, completed, cancelled
    payment_status = Column(String(30), nullable=False, default="pending")  # pending, paid, failed, refunded
    cancelled_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    cancel_reason = Column(Text, nullable=True)
    cancelled_at = Column(TIMESTAMP, nullable=True)
    completed_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    farmer_profile = relationship("FarmerProfile")
    creator_profile = relationship("CreatorProfile", back_populates="collaborations")
    farm = relationship("FarmListing")
