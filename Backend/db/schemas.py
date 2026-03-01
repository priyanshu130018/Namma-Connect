from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime, date as DateType
from decimal import Decimal


# ─────────────────────────────────────────────────────────────
# AUTH SCHEMAS
# ─────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Optional[str] = "tourist" # tourist, creator, farmer
    mobile: Optional[str] = Field(None, min_length=10, max_length=10)


class LoginRequest(BaseModel):
    identifier: str # email
    password: str


class ChangePasswordRequest(BaseModel):
    identifier: str # email
    new_password: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    profile_id: int # Profile ID (tourist_id, creator_id, or farmer_id)
    user_id: int # Login table ID
    role: str
    name: str
    email: Optional[EmailStr] = None
    mobile: Optional[str] = Field(None, min_length=10, max_length=10)


# ─────────────────────────────────────────────────────────────
# TOURIST SCHEMAS
# ─────────────────────────────────────────────────────────────

class TouristBase(BaseModel):
    name: str = Field(..., min_length=2)
    age: Optional[int] = Field(None, ge=0)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    postal_code: Optional[str] = None
    mobile: Optional[str] = Field(None, min_length=10, max_length=10)
    email: Optional[EmailStr] = None
    aadhaar_no: Optional[str] = Field(None, min_length=12, max_length=12)
    bio: Optional[str] = None
    wishlist: Optional[str] = None

class TouristUpdate(TouristBase):
    name: Optional[str] = Field(None, min_length=2)

class TouristOut(TouristBase):
    id: int
    user_id: int
    is_verified: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────
# CREATOR SCHEMAS
# ─────────────────────────────────────────────────────────────

class CreatorBase(BaseModel):
    name: str = Field(..., min_length=2)
    age: Optional[int] = Field(None, ge=0)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    postal_code: Optional[str] = None
    mobile: Optional[str] = Field(None, min_length=10, max_length=10)
    email: Optional[EmailStr] = None
    aadhaar_no: Optional[str] = Field(None, min_length=12, max_length=12)
    niche: Optional[str] = None
    portfolio: Optional[str] = None
    instagram: Optional[str] = None
    youtube: Optional[str] = None
    has_work_experience: bool = False
    bio: Optional[str] = None
    rate: Optional[Decimal] = Field(0.00, ge=0)

class CreatorRegisterRequest(CreatorBase):
    pass

class CreatorOut(CreatorBase):
    id: int
    user_id: int
    is_verified: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────
# FARMER PROFILE SCHEMAS
# ─────────────────────────────────────────────────────────────

class FarmerBase(BaseModel):
    name: str = Field(..., min_length=2)
    age: Optional[int] = Field(None, ge=0)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    postal_code: Optional[str] = None
    mobile: Optional[str] = Field(None, min_length=10, max_length=10)
    email: Optional[EmailStr] = None
    aadhaar_no: Optional[str] = Field(None, min_length=12, max_length=12)
    identity_proof: Optional[str] = None

class FarmerProfileCreate(FarmerBase):
    pass

class FarmerProfileOut(FarmerBase):
    id: int
    user_id: int
    is_verified: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────
# FARM LISTING SCHEMAS
# ─────────────────────────────────────────────────────────────

class FarmListingBase(BaseModel):
    farm_name: str = Field(..., min_length=2)
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    mobile: Optional[str] = Field(None, min_length=10, max_length=10)
    email: Optional[EmailStr] = None
    crop_types: Optional[str] = None
    farm_photo: Optional[str] = None
    stay_available: Optional[str] = None
    transport_available: Optional[str] = None
    activities: Optional[str] = None
    price_per_night: Optional[Decimal] = Field(None, ge=0)
    is_active: bool = True

class FarmListingCreate(FarmListingBase):
    pass

class FarmListingOut(FarmListingBase):
    id: int
    farmer_id: int
    user_id: Optional[int] = None
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class FarmerRegisterRequest(BaseModel):
    profile: FarmerProfileCreate
    listing: Optional[FarmListingCreate] = None


# ─────────────────────────────────────────────────────────────
# BOOKING SCHEMAS
# ─────────────────────────────────────────────────────────────

class BookingCreate(BaseModel):
    tourist_id: Optional[int] = None
    booking_type: str  # farm, creator
    farm_id: Optional[int] = None
    creator_id: Optional[int] = None
    check_in: DateType
    check_out: DateType

    adults: int = Field(1, ge=1)
    children: int = Field(0, ge=0)

    total_price: Decimal = Field(0.00, ge=0)
    collab_note: Optional[str] = None

    @validator("check_out")
    def validate_dates(cls, v, values):
        check_in = values.get("check_in")
        if check_in and v <= check_in:
            raise ValueError("check_out must be after check_in")
        return v

class BookingOut(BaseModel):
    id: int
    tourist_id: int
    booking_type: str
    farm_id: Optional[int] = None
    creator_id: Optional[int] = None
    check_in: DateType
    check_out: DateType

    adults: int
    children: int
    guests: int

    total_price: Decimal
    collab_note: Optional[str]
    status: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    # Fields added for frontend convenience (not in DB)
    item_name: Optional[str] = None
    item_emoji: Optional[str] = None
    region: Optional[str] = None
    tourist_name: Optional[str] = None

    class Config:
        from_attributes = True


class BookingStatusUpdate(BaseModel):
    status: str


# ─────────────────────────────────────────────────────────────
# USER SCHEMAS
# ─────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    mobile: Optional[str]
    is_active: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────
# CONTACT SCHEMAS
# ─────────────────────────────────────────────────────────────

class ContactCreate(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    topic: Optional[str] = None
    message: Optional[str] = None


class ContactOut(ContactCreate):
    id: int
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
