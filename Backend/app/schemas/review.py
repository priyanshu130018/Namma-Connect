from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime

class ReviewCreate(BaseModel):
    target_type: Literal["farm", "activity", "creator"]
    target_id: int
    rating: int = Field(..., ge=1, le=5, description="Rating integer from 1 to 5")
    comment: Optional[str] = None

class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5, description="Rating integer from 1 to 5")
    comment: Optional[str] = None

class ReviewOut(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    target_type: str
    target_id: int
    target_name: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ReviewListResponse(BaseModel):
    total: int
    avg_rating: float
    reviews: List[ReviewOut]
