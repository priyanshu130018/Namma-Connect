"""Authentication and user schemas."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegisterRequest(BaseModel):
    """Payload for user registration."""

    email: EmailStr
    password: str = Field(..., min_length=6, description="Password min 6 characters")
    full_name: str = Field(..., min_length=2, description="User full legal name")
    mobile: Optional[str] = Field(None, description="Optional contact mobile number")
    role: Optional[str] = Field("customer", description="customer | partner | farmer | creator")


class UserLoginRequest(BaseModel):
    """Payload for standard email/password login."""

    email: str = Field(..., description="Email address or registered identifier")
    password: str = Field(..., description="User secret password")


class UserResponse(BaseModel):
    """Authoritative user entity representation (never returns password)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    mobile: Optional[str] = None
    role: str
    is_active: bool = True
    is_verified: bool = False
    phone_verified: bool = False
    auth_provider: str = "local"
    avatar_url: Optional[str] = None
    location: Optional[str] = "Bengaluru, Karnataka"
    language: Optional[str] = "English, Kannada"
    theme_preference: Optional[str] = "system"
    bio: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None


class UserProfileUpdateRequest(BaseModel):
    """Payload for updating editable profile fields."""

    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    mobile: Optional[str] = Field(None, max_length=32)
    location: Optional[str] = Field(None, max_length=255)
    language: Optional[str] = Field(None, max_length=64)
    avatar_url: Optional[str] = Field(None, max_length=512)
    bio: Optional[str] = Field(None, max_length=1000)
    gender: Optional[str] = Field(None, max_length=32)
    date_of_birth: Optional[str] = Field(None, max_length=32)
    tags: Optional[List[str]] = Field(None)


class UserSettingsResponse(BaseModel):
    """Authoritative user settings representation."""

    user_id: str
    email: str
    mobile: Optional[str] = None
    language: str = "English, Kannada"
    theme: str = "system"
    notifications: dict = Field(default_factory=dict)
    privacy: dict = Field(default_factory=dict)


class UserPreferencesUpdateRequest(BaseModel):
    """Payload for updating user theme and language preferences."""

    theme_preference: Optional[str] = Field(None, description="light | dark | system")
    language: Optional[str] = Field(None, description="en | kn | hi")


class UserPreferencesResponse(BaseModel):
    """Authoritative user preferences response."""

    theme_preference: str
    language: str


class UserSettingsUpdateRequest(BaseModel):
    """Payload for updating user settings & preferences."""

    language: Optional[str] = None
    theme: Optional[str] = None
    theme_preference: Optional[str] = None
    notifications: Optional[dict] = None
    privacy: Optional[dict] = None


class VerificationChangeRequest(BaseModel):
    """Payload for submitting a protected credential change request."""

    field: str = Field(..., description="Field to change e.g. Verified Name, Verified Phone, Verified Email")
    requested_value: str = Field(..., min_length=1, max_length=255)
    reason: str = Field(..., min_length=3, max_length=1000)


class TokenResponse(BaseModel):
    """JWT Token response bundle."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    """Payload for refreshing an expired access token."""

    refresh_token: str


class GoogleAuthRequest(BaseModel):
    """Payload for Google OAuth id_token exchange."""

    credential: str


class ForgotPasswordRequest(BaseModel):
    """Payload for requesting a password reset email."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Payload for executing a password reset with a valid token."""

    token: str
    new_password: str = Field(..., min_length=6)


class ChangePasswordRequest(BaseModel):
    """Payload for authenticated password change."""

    current_password: str
    new_password: str = Field(..., min_length=6)


class PasswordOTPRequest(BaseModel):
    """Payload to request password change OTP via email."""

    email: Optional[EmailStr] = None


class PasswordOTPVerifyRequest(BaseModel):
    """Payload to verify password change OTP."""

    otp: str = Field(..., min_length=4, max_length=10)


class PasswordChangeWithOTPRequest(BaseModel):
    """Payload to change password after successful OTP verification."""

    otp_token: str = Field(...)
    new_password: str = Field(..., min_length=6)


class EmailOTPRequest(BaseModel):
    """Payload to request email verification OTP."""

    email: Optional[EmailStr] = None


class EmailOTPVerifyRequest(BaseModel):
    """Payload to verify email address with OTP."""

    otp: str = Field(..., min_length=4, max_length=10)


class VerifyEmailRequest(BaseModel):
    """Payload for verifying email address."""

    token: str


class VerifyPhoneRequest(BaseModel):
    """Payload for verifying mobile OTP."""

    phone: str
    otp: str


class ResendVerificationRequest(BaseModel):
    """Payload for requesting verification email re-dispatch."""

    email: Optional[EmailStr] = None
