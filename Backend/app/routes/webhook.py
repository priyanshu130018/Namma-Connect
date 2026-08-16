from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
import json
import hmac
import hashlib
import os

from app.core.database import get_db
from app.core.config import settings
from app.core.logger import logger
from app.models.booking import Booking
from app.models.payment import Payment
from app.services.email_service import EmailService

router = APIRouter()

@router.post("/webhook/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    raw_body = await request.body()
    
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET") or settings.RAZORPAY_SECRET
    if secret and x_razorpay_signature:
        expected_sig = hmac.new(
            secret.encode("utf-8"),
            raw_body,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected_sig, x_razorpay_signature):
            logger.warning("Invalid webhook signature received")
            raise HTTPException(status_code=400, detail="Signature verification failed")

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event = payload.get("event")
    logger.info(f"Received Razorpay Webhook Event: {event}")

    event_payload = payload.get("payload", {})
    payment_entity = event_payload.get("payment", {}).get("entity", {})
    notes = payment_entity.get("notes", {})
    receipt = payment_entity.get("receipt", "")

    pay_type = notes.get("type")
    ref_id = notes.get("booking_id") or notes.get("collaboration_id") or notes.get("reference_id")

    if not ref_id and receipt:
        parts = receipt.split("_")
        if len(parts) >= 3:
            pay_type = parts[1]
            try:
                ref_id = int(parts[2])
            except ValueError:
                pass
        elif len(parts) == 2:
            try:
                ref_id = int(parts[1])
            except ValueError:
                pass

    if not pay_type:
        pay_type = "booking"

    if not ref_id:
        logger.warning("Webhook received without reference_id")
        return {"success": False, "message": "reference_id not resolved"}

    if pay_type == "collaboration":
        from app.models.collaboration import Collaboration
        collab = db.query(Collaboration).filter(Collaboration.id == ref_id).first()
        if not collab:
            logger.warning(f"Webhook collaboration not found: {ref_id}")
            return {"success": False, "message": "Collaboration not found"}

        if collab.payment_status == "paid":
            logger.info(f"Payment already processed for collaboration {ref_id}")
            return {"success": True, "message": "Payment already processed"}

        if event == "payment.captured":
            collab.payment_status = "paid"
            collab.status = "paid"
            existing_payment = db.query(Payment).filter(
                Payment.type == "collaboration",
                Payment.reference_id == collab.id,
                Payment.status == "paid"
            ).first()
            if not existing_payment:
                payment = Payment(
                    type="collaboration",
                    reference_id=collab.id,
                    user_id=collab.farmer_profile.user_id if collab.farmer_profile else 1,
                    razorpay_order_id=payment_entity.get("order_id", "order_webhook"),
                    razorpay_payment_id=payment_entity.get("id"),
                    amount=collab.amount or 0.0,
                    status="paid"
                )
                db.add(payment)
            db.commit()
            logger.info(f"Payment captured successfully for collaboration {ref_id}")
        elif event == "payment.failed":
            collab.payment_status = "failed"
            db.commit()
            logger.info(f"Payment failed for collaboration {ref_id}")
        return {"success": True}

    else:
        booking = db.query(Booking).filter(Booking.id == ref_id).first()
        if not booking:
            logger.warning(f"Webhook booking not found: {ref_id}")
            return {"success": False, "message": "Booking not found"}

        if booking.payment_status == "paid":
            logger.info(f"Payment already processed for booking {ref_id}")
            return {"success": True, "message": "Payment already processed"}

        if event == "payment.captured":
            booking.payment_status = "paid"
            booking.status = "confirmed"
            
            existing_payment = db.query(Payment).filter(
                Payment.type == "booking",
                Payment.reference_id == booking.id,
                Payment.status == "paid"
            ).first()
            if not existing_payment:
                payment = Payment(
                    type="booking",
                    reference_id=booking.id,
                    user_id=booking.user_id,
                    razorpay_order_id=payment_entity.get("order_id", "order_webhook"),
                    razorpay_payment_id=payment_entity.get("id"),
                    amount=booking.amount,
                    status="paid"
                )
                db.add(payment)
            db.commit()

            email = booking.contact_email
            name = booking.contact_name or "Guest"
            
            if email:
                subject = "Booking Paid Successfully"
                body = f"Hi {name}, we verified your payment for booking ID {booking.id}. Thanks for traveling with us!"
                EmailService.send_email(email, subject, body)

            logger.info(f"Payment captured successfully for booking {ref_id}")

        elif event == "payment.failed":
            booking.payment_status = "failed"
            db.commit()
            logger.info(f"Payment failed for booking {ref_id}")

        return {"success": True}
