from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, func, Numeric, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class FarmListing(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    address = Column(Text, nullable=True)
    village = Column(String(100), nullable=True)
    taluk = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    farm_area = Column(Numeric(10, 2), nullable=True)
    farm_area_unit = Column(String(20), nullable=True)
    farm_type = Column(String(100), nullable=True)
    primary_crops = Column(JSON, nullable=True)
    price_from = Column(Numeric(12, 2), nullable=True)
    status = Column(String(30), nullable=False, default="active")  # active, inactive
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    farmer_profile = relationship("FarmerProfile", back_populates="farms")
    bookings = relationship("Booking", back_populates="farm", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="farm", cascade="all, delete-orphan")

    @property
    def user_id(self):
        return self.farmer_profile.user_id if self.farmer_profile else None

    @property
    def farm_name(self):
        return self.name

    @property
    def price_per_night(self):
        return self.price_from

