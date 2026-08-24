"""Payment endpoints for Razorpay order generation and verification."""

from fastapi import APIRouter, Depends, status, Request, Header
from typing import Optional
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.payment import (
    PaymentOrderCreateRequest,
    PaymentOrderResponse,
    PaymentVerifyRequest,
    PaymentVerificationResponse,
)
from app.services.payment import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/create-order", response_model=APIResponse[PaymentOrderResponse], status_code=status.HTTP_201_CREATED)
def create_payment_order(
    req: PaymentOrderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new Razorpay payment order for an existing pending reservation."""
    order = PaymentService.create_payment_order(db, current_user, req)
    return APIResponse(
        success=True,
        message="Payment order created successfully",
        data=order,
    )


@router.post("/verify", response_model=APIResponse[PaymentVerificationResponse])
def verify_payment(
    req: PaymentVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify cryptographic Razorpay gateway signature and confirm reservation."""
    verification = PaymentService.verify_payment(db, current_user, req)
    return APIResponse(
        success=True,
        message="Payment signature verified and booking confirmed successfully",
        data=verification,
    )


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Handle asynchronous Razorpay payment webhook notifications."""
    raw_body = await request.body()
    payload = await request.json()
    result = PaymentService.handle_webhook(
        db, payload, signature=x_razorpay_signature, raw_body=raw_body
    )
    return {"status": "ok", "result": result}
