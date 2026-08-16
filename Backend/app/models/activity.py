from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, func, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base

class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(12, 2), nullable=False, default=0.00)
    duration_minutes = Column(Integer, nullable=True)
    capacity = Column(Integer, nullable=True)
    status = Column(String(30), nullable=False, default="active")  # active, inactive
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    farm = relationship("FarmListing", back_populates="activities")
