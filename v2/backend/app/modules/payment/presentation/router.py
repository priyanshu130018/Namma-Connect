"""Payment presentation router."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.modules.user.domain.models import User
from app.modules.payment.infrastructure.repository import PaymentRepository
from app.modules.booking.infrastructure.repository import BookingRepository
from app.modules.payment.application.service import PaymentService
from app.modules.payment.presentation.schemas import (
    CreateOrderRequest,
    CreateOrderResponse,
    VerifyPaymentRequest,
    PaymentResponse,
    RefundRequest,
    RefundResponse,
    CreatePayoutRequest,
    PayoutResponse,
)

router = APIRouter(tags=["Payments"])


def get_payment_service(db: Session = Depends(get_db)) -> PaymentService:
    payment_repo = PaymentRepository(db)
    booking_repo = BookingRepository(db)
    return PaymentService(payment_repo, booking_repo)


@router.post("/payments/create-order", response_model=CreateOrderResponse, status_code=status.HTTP_201_CREATED)
def create_payment_order(
    payload: CreateOrderRequest,
    current_user: User = Depends(get_current_active_user),
    service: PaymentService = Depends(get_payment_service),
):
    """Initiate payment and create Razorpay order for a booking."""
    return service.create_order(user=current_user, payload=payload)


@router.post("/payments/verify", response_model=PaymentResponse)
def verify_payment(
    payload: VerifyPaymentRequest,
    current_user: User = Depends(get_current_active_user),
    service: PaymentService = Depends(get_payment_service),
):
    """Verify Razorpay payment signature and confirm booking."""
    return service.verify_payment(user=current_user, payload=payload)


@router.post("/payments/refund", response_model=RefundResponse)
def refund_payment(
    payload: RefundRequest,
    current_user: User = Depends(get_current_active_user),
    service: PaymentService = Depends(get_payment_service),
):
    """Process a refund for a payment."""
    return service.process_refund(user=current_user, payload=payload)


@router.post("/payouts", response_model=PayoutResponse, status_code=status.HTTP_201_CREATED)
def create_payout(
    payload: CreatePayoutRequest,
    current_user: User = Depends(get_current_active_user),
    service: PaymentService = Depends(get_payment_service),
):
    """Trigger a payout disbursement (Admin)."""
    return service.create_payout(admin=current_user, payload=payload)


@router.get("/payouts/provider", response_model=dict)
def list_provider_payouts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    service: PaymentService = Depends(get_payment_service),
):
    """List payouts for the authenticated provider."""
    return service.list_provider_payouts(provider=current_user, page=page, page_size=page_size)
