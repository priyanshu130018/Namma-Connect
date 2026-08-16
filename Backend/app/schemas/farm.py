from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class FarmListingCreate(BaseModel):
    name: str = Field(..., min_length=2)
    description: Optional[str] = None
    address: Optional[str] = None
    village: Optional[str] = None
    taluk: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    farm_area: Optional[Decimal] = None
    farm_area_unit: Optional[str] = None
    farm_type: Optional[str] = None
    primary_crops: Optional[List[str]] = None
    price_from: Optional[Decimal] = Field(None, ge=0)
    status: Optional[str] = "active"

    @model_validator(mode="before")
    @classmethod
    def translate_legacy_keys(cls, data):
        if isinstance(data, dict):
            if "farm_name" in data and "name" not in data:
                data["name"] = data["farm_name"]
            if "price_per_night" in data and "price_from" not in data:
                data["price_from"] = data["price_per_night"]
            if "crop_types" in data and "primary_crops" not in data:
                crops_val = data["crop_types"]
                if isinstance(crops_val, str):
                    data["primary_crops"] = [c.strip() for c in crops_val.split(",") if c.strip()]
                elif isinstance(crops_val, list):
                    data["primary_crops"] = crops_val
        return data


class FarmListingOut(BaseModel):
    id: int
    farmer_id: int
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    village: Optional[str] = None
    taluk: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    farm_area: Optional[Decimal] = None
    farm_area_unit: Optional[str] = None
    farm_type: Optional[str] = None
    primary_crops: Optional[List[str]] = None
    price_from: Optional[Decimal] = None
    status: str
    created_at: datetime
    updated_at: datetime
    farm_name: Optional[str] = None
    price_per_night: Optional[Decimal] = None
    user_id: Optional[int] = None

    class Config:
        from_attributes = True



class ActivityCreate(BaseModel):
    farm_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    price: Decimal = Field(0.00, ge=0)
    duration_minutes: Optional[int] = None
    capacity: Optional[int] = None
    status: Optional[str] = "active"

class ActivityOut(BaseModel):
    id: int
    farm_id: int
    name: str
    description: Optional[str] = None
    price: Decimal
    duration_minutes: Optional[int] = None
    capacity: Optional[int] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

FarmerRegisterRequest = FarmListingCreate
FarmListingBase = FarmListingCreate


