from sqlalchemy import Column, Integer, String, Text, Boolean, Date, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import relationship
from .database import Base


class Login(Base):
    __tablename__ = "login"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column("password", String(255), nullable=False)
    
    name = Column(String(150), nullable=False)
    mobile = Column(String(20))
    
    role = Column(String(50), default="tourist")  # tourist | farmer | creator
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    tourist = relationship("Tourist",     back_populates="login", uselist=False)
    creator = relationship("Creator",     back_populates="login", uselist=False)
    farmer  = relationship("Farmer",      back_populates="login", uselist=False)


class Tourist(Base):
    __tablename__ = "tourist"

    id = Column(Integer, primary_key=True, index=True)
    login_id = Column(Integer, ForeignKey("login.id"), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    age = Column(Integer)
    address = Column(String(500))
    mobile = Column(String(20))
    profile_pic = Column(String(500))
    bio = Column(Text)
    preferences = Column(Text)
    wishlist = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())

    login = relationship("Login", back_populates="tourist")


class Creator(Base):
    __tablename__ = "creator"

    id = Column(Integer, primary_key=True, index=True)
    login_id = Column(Integer, ForeignKey("login.id"), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    age = Column(Integer)
    address = Column(String(500))
    niche = Column(String(200))
    state = Column(String(100))
    country = Column(String(100))
    mobile = Column(String(20))
    portfolio = Column(String(500))
    instagram = Column(String(200))
    youtube = Column(String(200))
    aadhaar_no = Column(String(20))
    bio = Column(Text)
    has_work_experience = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    login = relationship("Login", back_populates="creator")


class Farmer(Base):
    __tablename__ = "farmer"

    id = Column(Integer, primary_key=True, index=True)
    login_id = Column(Integer, ForeignKey("login.id"), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    age = Column(Integer)
    area = Column(String(200))
    state = Column(String(100))
    country = Column(String(100))
    mobile = Column(String(20))
    email = Column(String(255))
    aadhaar_no = Column(String(20))
    is_verified = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    login = relationship("Login", back_populates="farmer")
    listings = relationship("FarmListing", back_populates="owner")


class FarmListing(Base):
    __tablename__ = "farm_listing"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmer.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    location = Column(String(500))
    area = Column(String(200))
    state = Column(String(100))
    mobile = Column(String(20))
    email = Column(String(255))
    crop_types = Column(String(500))
    farm_photo = Column(String(500))
    stay_available = Column(String(500))
    transport_available = Column(String(500))
    activities = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    owner = relationship("Farmer", back_populates="listings")


class Booking(Base):
    __tablename__ = "booking"

    id = Column(Integer, primary_key=True, index=True)
    tourist_login_id = Column(Integer, ForeignKey("login.id"), nullable=False)
    booking_type = Column(String(20), nullable=False)   # "farm" | "creator"
    item_id = Column(Integer, nullable=False)
    item_name = Column(String(255), nullable=False)
    item_emoji = Column(String(10), default="🌾")
    region = Column(String(255))
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    guests = Column(Integer, default=1)
    total_price = Column(Integer, default=0)
    collab_note = Column(Text)
    status = Column(String(30), default="Confirmed")
    created_at = Column(TIMESTAMP, server_default=func.now())

    tourist = relationship("Login", foreign_keys=[tourist_login_id])


class Contact(Base):
    __tablename__ = "contact"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    topic = Column(String(150))
    message = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
