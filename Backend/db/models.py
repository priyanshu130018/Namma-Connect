from sqlalchemy import Column, Integer, String, Text, Boolean, Date, ForeignKey, TIMESTAMP, func, Enum, Numeric, CheckConstraint
from sqlalchemy.orm import relationship
from .database import Base

# 1. User Table (User Authentication)
class Login(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False) # Stores hashed password
    role = Column(Enum("tourist", "creator", "farmer", "admin", name="user_roles"), nullable=False)
    mobile = Column(String(15))
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships to profile tables
    tourist = relationship("Tourist", back_populates="user", uselist=False)
    creator = relationship("Creator", back_populates="user", uselist=False)
    farmer  = relationship("Farmer",  back_populates="user", uselist=False)

# 2. Tourist Table (Tourist Profile)
class Tourist(Base):
    __tablename__ = "tourist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(150), nullable=False)
    age = Column(Integer)
    address = Column(String(255))
    city = Column(String(100), index=True)
    state = Column(String(100), index=True)
    country = Column(String(100), default="India")
    postal_code = Column(String(20))
    mobile = Column(String(15))
    email = Column(String(150))
    aadhaar_no = Column(String(12))
    is_verified = Column(Boolean, default=False)
    bio = Column(Text)
    wishlist = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    user = relationship("Login", back_populates="tourist")

# 3. Creator Table (Creator Profile)
class Creator(Base):
    __tablename__ = "creator"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(150), nullable=False)
    age = Column(Integer)
    address = Column(String(255))
    city = Column(String(100), index=True)
    state = Column(String(100), index=True)
    country = Column(String(100), default="India")
    postal_code = Column(String(20))
    mobile = Column(String(15))
    email = Column(String(150))
    aadhaar_no = Column(String(12))
    is_verified = Column(Boolean, default=False)
    niche = Column(String(150))
    portfolio = Column(String(255))
    instagram = Column(String(150))
    youtube = Column(String(150))
    has_work_experience = Column(Boolean, default=False)
    bio = Column(Text)
    rate = Column(Numeric(10, 2), default=0.00)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    user = relationship("Login", back_populates="creator")

# 4. Farmer Table (Farmer Profile)
class Farmer(Base):
    __tablename__ = "farmer"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(150), nullable=False)
    age = Column(Integer)
    address = Column(String(255))
    city = Column(String(100), index=True)
    state = Column(String(100), index=True)
    country = Column(String(100), default="India")
    postal_code = Column(String(20))
    mobile = Column(String(15))
    email = Column(String(150))
    aadhaar_no = Column(String(12))
    identity_proof = Column(Text)
    is_verified = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    user = relationship("Login", back_populates="farmer")
    listings = relationship("FarmListing", back_populates="owner", cascade="all, delete-orphan")

# 5. Farm Listing Table
class FarmListing(Base):
    __tablename__ = "farm_listing"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmer.id"), nullable=False)
    farm_name = Column(String(255), nullable=False)
    description = Column(Text)
    address = Column(String(255))
    city = Column(String(100), index=True)
    state = Column(String(100), index=True)
    mobile = Column(String(20))
    email = Column(String(255))
    crop_types = Column(String(500))
    farm_photo = Column(String(500))
    stay_available = Column(String(100))
    transport_available = Column(String(100))
    activities = Column(Text)
    price_per_night = Column(Numeric(10, 2), index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    owner = relationship("Farmer", back_populates="listings")

    @property
    def user_id(self):
        return self.owner.user_id if self.owner else None

# 6. Booking Table
class Booking(Base):
    __tablename__ = "booking"

    __table_args__ = (
        CheckConstraint(
            "(booking_type = 'farm' AND farm_id IS NOT NULL AND creator_id IS NULL) OR "
            "(booking_type = 'creator' AND creator_id IS NOT NULL AND farm_id IS NULL)",
            name="check_booking_type_integrity"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    tourist_id = Column(Integer, ForeignKey("tourist.id"), nullable=False)
    booking_type = Column(Enum("farm", "creator", name="booking_types"), nullable=False)
    farm_id = Column(Integer, ForeignKey("farm_listing.id"), nullable=True)
    creator_id = Column(Integer, ForeignKey("creator.id"), nullable=True)
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    adults = Column(Integer, nullable=False, default=1)
    children = Column(Integer, nullable=False, default=0)
    guests = Column(Integer, nullable=False, default=1)
    total_price = Column(Numeric(10, 2), default=0.00)
    collab_note = Column(Text)
    status = Column(Enum("pending", "confirmed", "cancelled", "completed", name="booking_status"), default="pending")
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    tourist = relationship("Tourist")
    farm = relationship("FarmListing")
    creator = relationship("Creator")

# 7. Contact Us Table
class ContactUs(Base):
    __tablename__ = "contact_us"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    topic = Column(String(150))
    message = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
