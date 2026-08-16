from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from fastapi.security import OAuth2PasswordBearer

from app.core.database import get_db
from app.core.security import decode_token
from app.services.payment_service import PaymentService
from app.schemas.payment import PaymentCreate, PaymentOut
from app.dependencies.auth import get_current_user
from app.models.user import Login
from app.dependencies.rate_limit import payment_limiter

router = APIRouter()



class OrderCreateRequest(BaseModel):
    booking_id: Optional[int] = None
    type: Optional[str] = "booking"
    reference_id: Optional[int] = None

class PaymentVerifyRequest(BaseModel):
    booking_id: Optional[int] = None
    type: Optional[str] = "booking"
    reference_id: Optional[int] = None
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@router.post("/payments/create-order")
def create_payment_order(
    req: OrderCreateRequest,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user),
    _rate_limit = Depends(payment_limiter)
):
    pay_type = req.type
    ref_id = req.reference_id
    if req.booking_id is not None:
        pay_type = "booking"
        ref_id = req.booking_id

    if not ref_id:
        raise HTTPException(status_code=400, detail="Missing booking_id or reference_id")

    return PaymentService.create_order(pay_type, ref_id, db, current_user.id)

@router.post("/payments/verify")
def verify_payment_order(
    req: PaymentVerifyRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user),
    _rate_limit = Depends(payment_limiter)
):
    pay_type = req.type
    ref_id = req.reference_id
    if req.booking_id is not None:
        pay_type = "booking"
        ref_id = req.booking_id

    if not ref_id:
        raise HTTPException(status_code=400, detail="Missing booking_id or reference_id")

    success = PaymentService.verify_payment(
        pay_type,
        ref_id,
        req.razorpay_order_id,
        req.razorpay_payment_id,
        req.razorpay_signature,
        db,
        current_user.id,
        background_tasks
    )
    return {"success": success}

@router.get("/payments/history", response_model=List[PaymentOut])
def get_payments_history(
    db: Session = Depends(get_db),
    current_user: Login = Depends(get_current_user)
):
    return PaymentService.get_payments(db, current_user.id)
