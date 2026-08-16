from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, TIMESTAMP, func, Date, JSON, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base

class Login(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    mobile = Column(String(20), unique=True, nullable=True)
    password_hash = Column(Text, nullable=True)  # Stores hashed password
    google_id = Column(String(255), unique=True, nullable=True)
    profile_photo = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    def __init__(self, **kwargs):
        if "full_name" in kwargs:
            kwargs["name"] = kwargs.pop("full_name")
        if "password" in kwargs:
            kwargs["password_hash"] = kwargs.pop("password")
        kwargs.pop("role", None)
        super().__init__(**kwargs)

    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    farmer_profile = relationship("FarmerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    creator_profile = relationship("CreatorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="user", foreign_keys="[Application.user_id]", cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    dob = Column(Date, nullable=True)
    gender = Column(String(30), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True, default="India")
    pincode = Column(String(10), nullable=True)
    languages = Column(JSON, nullable=True)
    interests = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    user = relationship("Login", back_populates="profile")

    def __init__(self, **kwargs):
        self._temp_name = kwargs.pop("name", None)
        self._temp_mobile = kwargs.pop("mobile", None)
        self._temp_email = kwargs.pop("email", None)
        kwargs.pop("is_verified", None)
        kwargs.pop("aadhaar_no", None)
        super().__init__(**kwargs)

    @property
    def name(self):
        if hasattr(self, "_temp_name") and self._temp_name is not None:
            return self._temp_name
        return self.user.name if self.user else ""

    @property
    def email(self):
        if hasattr(self, "_temp_email") and self._temp_email is not None:
            return self._temp_email
        return self.user.email if self.user else ""

    @property
    def mobile(self):
        if hasattr(self, "_temp_mobile") and self._temp_mobile is not None:
            return self._temp_mobile
        return self.user.mobile if self.user else ""

    @property
    def is_verified(self):
        return True



class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(20), nullable=False)  # farmer, creator
    status = Column(String(20), nullable=False, default="pending")  # pending, approved, rejected
    submitted_at = Column(TIMESTAMP, server_default=func.now())
    reviewed_at = Column(TIMESTAMP, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    user = relationship("Login", back_populates="applications", foreign_keys=[user_id])
    reviewer = relationship("Login", foreign_keys=[reviewed_by])
    documents = relationship("VerificationDocument", back_populates="application", cascade="all, delete-orphan")


class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    farmer_id = Column(String(100), nullable=True)  # Farmer / FRUITS ID
    farm_experience_years = Column(Integer, nullable=True)
    farmer_category = Column(String(100), nullable=True)
    primary_crops = Column(JSON, nullable=True)
    verification_status = Column(String(20), nullable=False, default="pending")  # pending, approved, rejected
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    user = relationship("Login", back_populates="farmer_profile")
    farms = relationship("FarmListing", back_populates="farmer_profile", cascade="all, delete-orphan")

    @property
    def name(self):
        return self.user.name if self.user else ""

    @property
    def email(self):
        return self.user.email if self.user else ""

    @property
    def mobile(self):
        return self.user.mobile if self.user else ""

    @property
    def state(self):
        return self.user.profile.state if self.user and self.user.profile else ""

    @property
    def country(self):
        return self.user.profile.country if self.user and self.user.profile else ""

    @property
    def aadhaar_no(self):
        return ""

    @property
    def is_verified(self):
        return self.verification_status == "approved"


class CreatorProfile(Base):
    __tablename__ = "creator_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    display_name = Column(String(150), nullable=False)
    bio = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    experience_years = Column(Integer, nullable=True)
    languages = Column(JSON, nullable=True)
    instagram_url = Column(Text, nullable=True)
    facebook_url = Column(Text, nullable=True)
    youtube_url = Column(Text, nullable=True)
    portfolio_url = Column(Text, nullable=True)
    verification_status = Column(String(20), nullable=False, default="pending")  # pending, approved, rejected
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    user = relationship("Login", back_populates="creator_profile")
    collaborations = relationship("Collaboration", back_populates="creator_profile", cascade="all, delete-orphan")

    @property
    def name(self):
        return self.user.name if self.user else ""

    @property
    def email(self):
        return self.user.email if self.user else ""

    @property
    def mobile(self):
        return self.user.mobile if self.user else ""

    @property
    def state(self):
        return self.user.profile.state if self.user and self.user.profile else ""

    @property
    def country(self):
        return self.user.profile.country if self.user and self.user.profile else ""

    @property
    def aadhaar_no(self):
        return ""

    @property
    def niche(self):
        return self.category

    @property
    def portfolio(self):
        return self.portfolio_url

    @property
    def is_verified(self):
        return self.verification_status == "approved"



class VerificationDocument(Base):
    __tablename__ = "verification_documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    document_type = Column(String(50), nullable=False)  # aadhaar, pan, farmer_id, rtc, land_record, etc.
    document_number = Column(String(255), nullable=True)
    file_id = Column(Integer, ForeignKey("media.id"), nullable=True)
    verification_status = Column(String(20), nullable=False, default="pending")
    verified_at = Column(TIMESTAMP, nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    application = relationship("Application", back_populates="documents")
    media_file = relationship("Media", foreign_keys=[file_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    collaboration_id = Column(Integer, ForeignKey("collaborations.id"), nullable=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(255), nullable=False)
    mobile = Column(String(20), nullable=True)
    subject = Column(String(255), nullable=True)
    message = Column(Text, nullable=False)
    status = Column(String(30), default="pending")  # pending, read, archived
    created_at = Column(TIMESTAMP, server_default=func.now())


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(Text, nullable=False)
    expires_at = Column(TIMESTAMP, nullable=False)
    used_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

Tourist = Profile
Farmer = FarmerProfile
Creator = CreatorProfile
ContactUs = ContactMessage

