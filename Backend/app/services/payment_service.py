import razorpay
import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional

from app.core.config import settings
from app.models.booking import Booking
from app.models.collaboration import Collaboration
from app.models.payment import Payment
from app.services.email_service import EmailService

LOGGER = logging.getLogger(__name__)

# Initialize Razorpay client
razorpay_client = None
if settings.RAZORPAY_KEY and settings.RAZORPAY_SECRET:
    try:
        razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY, settings.RAZORPAY_SECRET))
    except Exception as e:
        LOGGER.error(f"Razorpay Client initialization error: {str(e)}")

class PaymentService:
    @staticmethod
    def create_order(pay_type: str, reference_id: int, db: Session, user_id: Optional[int] = None) -> dict:
        if pay_type == "booking":
            if user_id:
                target = db.query(Booking).filter(Booking.id == reference_id, Booking.user_id == user_id).first()
            else:
                target = db.query(Booking).filter(Booking.id == reference_id).first()
            if not target:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
            amount = float(target.amount)
        elif pay_type == "collaboration":
            target = db.query(Collaboration).filter(Collaboration.id == reference_id).first()
            if not target:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaboration not found")
            # Verify permission
            if user_id and target.farmer_profile.user_id != user_id and target.creator_profile.user_id != user_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to checkout this collaboration")
            amount = float(target.amount) if target.amount else 0.0
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment type")

        if amount <= 0:
            amount = 1.0  # Fallback minimum amount in INR for testing

        if razorpay_client:
            try:
                order_data = {
                    "amount": int(amount * 100),  # amount in paise
                    "currency": "INR",
                    "receipt": f"receipt_{pay_type}_{reference_id}"
                }
                order = razorpay_client.order.create(data=order_data)
                return {
                    "order_id": order.get("id"),
                    "amount": amount,
                    "currency": "INR",
                    "key": settings.RAZORPAY_KEY
                }
            except Exception as e:
                LOGGER.error(f"Razorpay order creation error: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Payment order creation failed: {str(e)}"
                )
        else:
            # Mock order for testing/development fallback
            mock_order_id = f"order_mock_{pay_type}_{reference_id}_123"
            return {
                "order_id": mock_order_id,
                "amount": amount,
                "currency": "INR",
                "key": "mock_razorpay_key",
                "mocked": True
            }

    @staticmethod
    def verify_payment(
        pay_type: str,
        reference_id: int,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
        db: Session,
        user_id: Optional[int] = None,
        background_tasks = None
    ) -> bool:
        if pay_type == "booking":
            if user_id:
                target = db.query(Booking).filter(Booking.id == reference_id, Booking.user_id == user_id).first()
            else:
                target = db.query(Booking).filter(Booking.id == reference_id).first()
            if not target:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
            amount = target.amount
            email = target.contact_email
            name = target.contact_name
        elif pay_type == "collaboration":
            target = db.query(Collaboration).filter(Collaboration.id == reference_id).first()
            if not target:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaboration not found")
            # Verify permission
            if user_id and target.farmer_profile.user_id != user_id and target.creator_profile.user_id != user_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
            amount = target.amount or 0.0
            email = target.farmer_profile.user.email
            name = target.farmer_profile.user.name
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment type")

        is_verified = False
        if razorpay_client and not razorpay_order_id.startswith("order_mock_"):
            try:
                params_dict = {
                    'razorpay_order_id': razorpay_order_id,
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_signature': razorpay_signature
                }
                razorpay_client.utility.verify_payment_signature(params_dict)
                is_verified = True
            except Exception as e:
                LOGGER.error(f"Razorpay payment verification error: {str(e)}")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment signature")
        else:
            # Mock verification success for testing
            is_verified = True

        if is_verified:
            # Check idempotency
            existing_payment = db.query(Payment).filter(
                Payment.type == pay_type,
                Payment.reference_id == reference_id,
                Payment.status == "paid"
            ).first()
            if existing_payment and target.payment_status == "paid":
                return True

            target.payment_status = "paid"
            if pay_type == "booking":
                target.status = "confirmed"
            elif pay_type == "collaboration":
                target.status = "paid"
            
            final_user_id = user_id if user_id else (target.user_id if pay_type == "booking" else target.farmer_profile.user_id)
            payment = Payment(
                user_id=final_user_id,
                type=pay_type,
                reference_id=reference_id,
                razorpay_order_id=razorpay_order_id,
                razorpay_payment_id=razorpay_payment_id,
                razorpay_signature=razorpay_signature,
                amount=amount,
                currency="INR",
                status="paid"
            )
            db.add(payment)
            db.commit()

            # Trigger email notification on payment success
            if email:
                try:
                    subject = "Payment Successful"
                    body = f"Hi {name}, your payment of INR {amount} for {pay_type} ID {reference_id} was successful. Thank you!"
                    if background_tasks and hasattr(background_tasks, "add_task"):
                        background_tasks.add_task(EmailService.send_email, email, subject, body)
                    else:
                        EmailService.send_email(email, subject, body)
                except Exception:
                    pass

            return True

        return False

    @staticmethod
    def get_payments(db: Session, user_id: int) -> list[Payment]:
        return db.query(Payment).filter(Payment.user_id == user_id).all()
