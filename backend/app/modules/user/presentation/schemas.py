"""User presentation schemas."""

from typing import Optional, List
from pydantic import BaseModel, Field


class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2)
    mobile: Optional[str] = None
    avatar_url: Optional[str] = None
    location: Optional[str] = None
    language: Optional[str] = None
    theme_preference: Optional[str] = None
    bio: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    tags: Optional[List[str]] = None


class UserPreferencesUpdateRequest(BaseModel):
    notification_preferences: Optional[dict] = None
    privacy_preferences: Optional[dict] = None
    theme_preference: Optional[str] = None
    language: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    mobile: Optional[str] = None
    role: str
    avatar_url: Optional[str] = None
    location: Optional[str] = None
    language: str
    theme_preference: str
    bio: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    is_active: bool
    is_verified: bool
    phone_verified: bool
    is_synthetic: bool = False
