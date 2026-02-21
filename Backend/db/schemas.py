from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date as DateType


# ─── Auth Schemas ────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    mobile: str

class LoginRequest(BaseModel):
    identifier: str
    password: str

class ChangePasswordRequest(BaseModel):
    identifier: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int      # Role-specific ID (tourist.id, farmer.id, etc.)
    login_id: int     # Global login ID (login.id)
    role: str
    name: str
    email: Optional[str] = None
    mobile: Optional[str] = None


# ─── Tourist Schemas ──────────────────────────────────────────────────────────
class TouristUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    address: Optional[str] = None
    mobile: Optional[str] = None
    bio: Optional[str] = None
    preferences: Optional[str] = None
    wishlist: Optional[str] = None

class TouristOut(BaseModel):
    id: int
    login_id: int
    name: str
    age: Optional[int]
    address: Optional[str]
    mobile: Optional[str]
    bio: Optional[str]
    preferences: Optional[str]
    wishlist: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

# ─── Creator Schemas ──────────────────────────────────────────────────────────
class CreatorRegisterRequest(BaseModel):
    name: str
    age: Optional[int] = None
    address: Optional[str] = None
    niche: Optional[str] = None          # was: area
    state: Optional[str] = None
    country: Optional[str] = None
    mobile: Optional[str] = None
    portfolio: Optional[str] = None
    instagram: Optional[str] = None      # was: instagram_id
    youtube: Optional[str] = None        # was: youtube_id
    aadhaar_no: Optional[str] = None
    has_work_experience: bool = False

class CreatorOut(CreatorRegisterRequest):
    id: int
    login_id: int
    is_verified: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Farm/Farmer Schemas ──────────────────────────────────────────────────────
class FarmerProfileCreate(BaseModel):
    name: str
    age: Optional[int] = None
    area: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    mobile: Optional[str] = None
    aadhaar_no: Optional[str] = None

class FarmerProfileOut(FarmerProfileCreate):
    id: int
    login_id: int
    is_verified: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

class FarmListingCreate(BaseModel):
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    area: Optional[str] = None
    state: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    crop_types: Optional[str] = None
    farm_photo: Optional[str] = None
    stay_available: Optional[str] = None
    transport_available: Optional[str] = None
    activities: Optional[str] = None

class FarmListingOut(FarmListingCreate):
    id: int
    farmer_id: int
    is_active: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

class FarmerRegisterRequest(BaseModel):
    # Composite request for initial setup
    profile: FarmerProfileCreate
    listing: Optional[FarmListingCreate] = None


# ─── Booking Schemas ──────────────────────────────────────────────────────────
class BookingCreate(BaseModel):
    booking_type: str          # "farm" | "creator"
    item_id: int
    item_name: str
    item_emoji: Optional[str] = "🌾"
    region: Optional[str] = None
    check_in: DateType
    check_out: DateType
    guests: int = 1
    total_price: int = 0
    collab_note: Optional[str] = None

class BookingOut(BookingCreate):
    id: int
    tourist_login_id: int
    tourist_name: Optional[str] = None
    status: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

class BookingStatusUpdate(BaseModel):
    status: str


# ─── User Schemas ─────────────────────────────────────────────────────────────
class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    user_type: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Contact Schema ──────────────────────────────────────────────────────────
class ContactCreate(BaseModel):
    name: str
    email: str
    topic: Optional[str] = None
    message: Optional[str] = None


class ContactOut(ContactCreate):
    id: int
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
