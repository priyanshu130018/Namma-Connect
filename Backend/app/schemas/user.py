from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Any
from datetime import datetime, date

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    mobile: Optional[str] = Field(None, min_length=10, max_length=10)

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v):
        if v is not None and not v.isdigit():
            raise ValueError("Mobile number must contain only digits")
        return v


class LoginRequest(BaseModel):
    identifier: str
    password: str


class ChangePasswordRequest(BaseModel):
    identifier: str
    new_password: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str
    email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    role: str = "tourist"  # Default role for legacy compat
    has_farmer_profile: bool = False
    has_creator_profile: bool = False
    farmer_verification_status: Optional[str] = None
    creator_verification_status: Optional[str] = None


class ProfileBase(BaseModel):
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    pincode: Optional[str] = None
    languages: Optional[List[str]] = None
    interests: Optional[List[str]] = None


class ProfileUpdate(ProfileBase):
    name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None


class ProfileOut(ProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FarmerProfileBase(BaseModel):
    farmer_id: Optional[str] = None
    farm_experience_years: Optional[int] = None
    farmer_category: Optional[str] = None
    primary_crops: Optional[List[str]] = None
    name: Optional[str] = None
    mobile: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    aadhaar_no: Optional[str] = None
    is_verified: Optional[bool] = None

    class Config:
        from_attributes = True

    @field_validator("aadhaar_no")
    @classmethod
    def validate_aadhaar(cls, v):
        if v is not None and v != "" and (len(v) != 12 or not v.isdigit()):
            raise ValueError("Aadhaar must be exactly 12 digits")
        return v

class FarmerProfileUpdate(FarmerProfileBase):
    pass

class FarmerProfileOut(FarmerProfileBase):
    id: int
    user_id: int
    verification_status: str
    created_at: datetime
    updated_at: datetime
    email: Optional[str] = None

    class Config:
        from_attributes = True


class CreatorProfileBase(BaseModel):
    display_name: str
    bio: Optional[str] = None
    category: Optional[str] = None
    experience_years: Optional[int] = None
    languages: Optional[List[str]] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    youtube_url: Optional[str] = None
    portfolio_url: Optional[str] = None


class CreatorProfileUpdate(CreatorProfileBase):
    pass


class CreatorProfileOut(CreatorProfileBase):
    id: int
    user_id: int
    verification_status: str
    created_at: datetime
    updated_at: datetime
    name: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    aadhaar_no: Optional[str] = None
    niche: Optional[str] = None
    portfolio: Optional[str] = None
    is_verified: Optional[bool] = None

    class Config:
        from_attributes = True



class ApplicationDocumentSchema(BaseModel):
    document_type: str
    document_number: Optional[str] = None
    file_id: Optional[int] = None

    @field_validator("document_number")
    @classmethod
    def validate_aadhaar(cls, v, info):
        # We need to know document_type. In Pydantic V2, we can access info.data
        if info.data.get("document_type") == "aadhaar":
            if v is not None and (len(v) != 12 or not v.isdigit()):
                raise ValueError("Aadhaar must be exactly 12 digits")
        return v


class ApplicationCreate(BaseModel):
    type: str  # farmer, creator
    # Professional fields for immediate creation upon approval
    farmer_details: Optional[FarmerProfileBase] = None
    creator_details: Optional[CreatorProfileBase] = None
    documents: List[ApplicationDocumentSchema] = []


class ApplicationOut(BaseModel):
    id: int
    user_id: int
    type: str
    status: str
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[int] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    mobile: Optional[str] = None
    is_active: bool
    created_at: datetime
    has_farmer_profile: bool = False
    has_creator_profile: bool = False

    class Config:
        from_attributes = True


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    mobile: Optional[str] = None
    subject: Optional[str] = None
    message: str


class ContactOut(ContactCreate):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    receiver_id: int
    message: str
    collaboration_id: Optional[int] = None
    booking_id: Optional[int] = None


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    collaboration_id: Optional[int] = None
    booking_id: Optional[int] = None
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

TouristBase = ProfileBase
TouristUpdate = ProfileUpdate
TouristOut = ProfileOut
FarmerBase = FarmerProfileBase
FarmerProfileCreate = FarmerProfileBase
CreatorBase = CreatorProfileBase
CreatorRegisterRequest = CreatorProfileBase
CreatorOut = CreatorProfileOut

class FarmerProfileCreateLegacy(BaseModel):
    name: str
    mobile: str
    email: str
    aadhaar_no: str
    state: Optional[str] = None
    country: Optional[str] = None

    @field_validator("aadhaar_no")
    @classmethod
    def validate_aadhaar(cls, v):
        if len(v) != 12 or not v.isdigit():
            raise ValueError("Aadhaar must be exactly 12 digits")
        return v

class FarmerRegisterRequestLegacy(BaseModel):
    profile: FarmerProfileCreateLegacy

FarmerRegisterRequest = FarmerRegisterRequestLegacy



