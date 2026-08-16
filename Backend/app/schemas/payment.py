from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class PaymentCreate(BaseModel):
    type: str  # booking, collaboration
    reference_id: int
    amount: Decimal
    method: str

class PaymentOut(BaseModel):
    id: int
    type: str
    reference_id: int
    user_id: int
    amount: Decimal
    currency: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
