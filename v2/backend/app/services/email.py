"""Resend Transactional Email Service for NammaConnect V2."""

import json
import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logging import logger
from app.models.email_log import EmailLog


class EmailService:
    """Resend email integration handling transactional notifications with failure isolation."""

    @classmethod
    def is_configured(cls) -> bool:
        return bool(settings.RESEND_API_KEY)

    @classmethod
    def _log_email(
        cls,
        db: Optional[Session],
        recipient: str,
        event_type: str,
        subject: str,
        status: str,
        user_id: Optional[uuid.UUID] = None,
        resend_message_id: Optional[str] = None,
        error: Optional[str] = None,
    ):
        """Safely record an email dispatch attempt to the audit log if db session provided."""
        if not db:
            return
        try:
            log_entry = EmailLog(
                user_id=user_id,
                recipient=recipient,
                event_type=event_type,
                subject=subject,
                resend_message_id=resend_message_id,
                status=status,
                error=error,
            )
            db.add(log_entry)
            db.commit()
        except Exception as log_err:
            logger.warning(f"Failed to record email audit log: {log_err}")
            try:
                db.rollback()
            except Exception:
                pass

    @classmethod
    def send_email(
        cls,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        from_email: str = "notifications@nammaconnect.in",
        is_test_data: bool = False,
        event_type: str = "general",
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Send transactional email via Resend API. Failure will not raise exceptions that break transactions."""
        # 1. Skip real Resend delivery for test/seed data
        if is_test_data:
            logger.info(f"[TEST DATA SKIPPED EMAIL] To: {to_email} | Subject: {subject}")
            cls._log_email(db, to_email, event_type, subject, "skipped", user_id=user_id)
            return {"id": "test_data_skipped", "status": "skipped", "to": to_email}

        # 2. Mock mode if Resend API key is unconfigured or in automated test environments
        if not cls.is_configured() or settings.ENV in ["test", "testing"]:
            logger.info(f"[MOCK EMAIL] To: {to_email} | Subject: {subject}")
            cls._log_email(db, to_email, event_type, subject, "mock_sent", user_id=user_id, resend_message_id="mock_email_id")
            return {"id": "mock_email_id", "status": "mock_sent", "to": to_email}

        # 3. Live Resend API Dispatch
        try:
            import urllib.request

            url = "https://api.resend.com/emails"
            from_fmt = from_email if "<" in from_email else f"NammaConnect <{from_email}>"
            payload = {
                "from": from_fmt,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            if text_content:
                payload["text"] = text_content

            headers = {
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
                "User-Agent": "NammaConnect-Backend/2.0",
            }

            req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                msg_id = data.get("id")
                cls._log_email(db, to_email, event_type, subject, "sent", user_id=user_id, resend_message_id=msg_id)
                return {"id": msg_id, "status": "sent", "to": to_email}
        except Exception as e:
            logger.warning(f"Resend email delivery failed for {to_email}: {e}")
            cls._log_email(db, to_email, event_type, subject, "failed", user_id=user_id, error=str(e))
            return {"id": None, "status": "failed", "error": str(e), "to": to_email}

    # =========================================================================
    # Account & Verification Emails
    # =========================================================================

    @classmethod
    def send_welcome_email(
        cls,
        to_email: str,
        full_name: str,
        is_test_data: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Send welcome email upon registration."""
        subject = "Welcome to NammaConnect"
        html = f"""
        <div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;'>
            <h2 style='color: #047857; margin-top: 0;'>Welcome to NammaConnect, {full_name}!</h2>
            <p>We are thrilled to welcome you to Karnataka's authentic rural travel and farm stay collective.</p>
            <p>Explore organic coffee plantations, paddy retreats, pottery workshops, and vibrant creator stories directly supported by local farmers.</p>
            <div style='margin: 24px 0; padding: 16px; background-color: #f0fdf4; border-left: 4px solid #059669; border-radius: 4px;'>
                <p style='margin: 0; color: #065f46; font-size: 14px;'><strong>Next Step:</strong> Please verify your email address to unlock reservations and secure online checkout.</p>
            </div>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b; margin: 0;'>NammaConnect Technologies Pvt Ltd, Bengaluru, Karnataka</p>
        </div>
        """
        return cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            is_test_data=is_test_data,
            event_type="welcome",
            user_id=user_id,
            db=db,
        )

    @classmethod
    def send_verification_email(
        cls,
        to_email: str,
        verification_token: str,
        full_name: Optional[str] = None,
        is_test_data: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Send account verification link with signed token."""
        subject = "Verify your NammaConnect account"
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        verification_link = f"{frontend_url}/verify-email?token={verification_token}"
        greeting_name = f", {full_name}" if full_name else ""

        html = f"""
        <div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;'>
            <h2 style='color: #047857; margin-top: 0;'>Verify Your Email Address</h2>
            <p>Namaskara{greeting_name}!</p>
            <p>Thank you for joining NammaConnect. Please verify your email address by clicking the button below:</p>
            <div style='text-align: center; margin: 32px 0;'>
                <a href='{verification_link}' style='background-color: #047857; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;'>Verify My Account</a>
            </div>
            <p style='font-size: 13px; color: #64748b;'>Or copy and paste this verification link into your web browser:</p>
            <p style='font-size: 12px; color: #0284c7; word-break: break-all;'>{verification_link}</p>
            <p style='font-size: 13px; color: #64748b;'>This link is valid for 24 hours. If you did not create a NammaConnect account, you can safely ignore this email.</p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b; margin: 0;'>NammaConnect Technologies Pvt Ltd, Bengaluru, Karnataka</p>
        </div>
        """
        return cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            is_test_data=is_test_data,
            event_type="verification",
            user_id=user_id,
            db=db,
        )

    @classmethod
    def send_email_verified_confirmation(
        cls,
        to_email: str,
        full_name: Optional[str] = None,
        is_test_data: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Send confirmation receipt once user email verification succeeds."""
        subject = "Your NammaConnect email is verified"
        greeting = f", {full_name}" if full_name else ""

        html = f"""
        <div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;'>
            <h2 style='color: #047857; margin-top: 0;'>Email Verified Successfully</h2>
            <p>Namaskara{greeting}!</p>
            <p>Your email address <strong>{to_email}</strong> has been successfully verified.</p>
            <p>Your NammaConnect account is now in good standing with full access to reservations, live host communication, and checkout.</p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b; margin: 0;'>NammaConnect Technologies Pvt Ltd, Bengaluru, Karnataka</p>
        </div>
        """
        return cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            is_test_data=is_test_data,
            event_type="email_verified",
            user_id=user_id,
            db=db,
        )

    @classmethod
    def send_mobile_verified_confirmation(
        cls,
        to_email: str,
        mobile: str,
        full_name: Optional[str] = None,
        is_test_data: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Send confirmation that mobile verification was completed (never includes OTP)."""
        subject = "Your NammaConnect mobile number is verified"
        greeting = f", {full_name}" if full_name else ""

        html = f"""
        <div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;'>
            <h2 style='color: #047857; margin-top: 0;'>Mobile Number Verified</h2>
            <p>Namaskara{greeting}!</p>
            <p>Your contact number <strong>{mobile}</strong> has been successfully verified for your NammaConnect account.</p>
            <p>You will receive booking alerts and host updates directly to this phone number.</p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b; margin: 0;'>NammaConnect Technologies Pvt Ltd, Bengaluru, Karnataka</p>
        </div>
        """
        return cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            is_test_data=is_test_data,
            event_type="mobile_verified",
            user_id=user_id,
            db=db,
        )

    # =========================================================================
    # Booking & Cancellation Emails
    # =========================================================================

    @classmethod
    def send_booking_confirmation_email(
        cls,
        to_email: str,
        booking_code: str,
        service_title: str,
        amount: float,
        start_date: Optional[str] = None,
        is_test_data: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Send booking confirmation receipt to traveler."""
        subject = f"Booking Confirmed: {service_title} [{booking_code}]"
        date_line = f"<p style='margin: 4px 0;'><strong>Scheduled Date:</strong> {start_date}</p>" if start_date else ""

        html = f"""
        <div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;'>
            <h2 style='color: #047857; margin-top: 0;'>Reservation Confirmed!</h2>
            <p>Your booking for <strong>{service_title}</strong> is confirmed and secured.</p>
            <div style='background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; margin: 18px 0;'>
                <p style='margin: 4px 0;'><strong>Booking Code:</strong> {booking_code}</p>
                <p style='margin: 4px 0;'><strong>Total Paid:</strong> ₹{amount:,.2f}</p>
                {date_line}
            </div>
            <p>You can view itinerary details, host contact information, and cancellation policies in the <strong>My Trips</strong> section.</p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b; margin: 0;'>NammaConnect Technologies Pvt Ltd, Bengaluru, Karnataka</p>
        </div>
        """
        return cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            is_test_data=is_test_data,
            event_type="booking_confirmed",
            user_id=user_id,
            db=db,
        )

    @classmethod
    def send_provider_booking_notification(
        cls,
        to_email: str,
        provider_name: str,
        booking_code: str,
        service_title: str,
        customer_name: str,
        is_test_data: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Notify host provider of a newly confirmed guest booking."""
        subject = f"New Booking Received: {service_title} [{booking_code}]"
        html = f"""
        <div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;'>
            <h2 style='color: #047857; margin-top: 0;'>Hello {provider_name}, You Have a New Booking!</h2>
            <p>Guest <strong>{customer_name}</strong> has confirmed a reservation for <strong>{service_title}</strong>.</p>
            <div style='background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; margin: 18px 0;'>
                <p style='margin: 4px 0;'><strong>Booking Code:</strong> {booking_code}</p>
                <p style='margin: 4px 0;'><strong>Guest Name:</strong> {customer_name}</p>
            </div>
            <p>Please check your <strong>Partner Bookings Manifest</strong> in the Provider Portal to prepare for their arrival.</p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b; margin: 0;'>NammaConnect Technologies Pvt Ltd, Bengaluru, Karnataka</p>
        </div>
        """
        return cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            is_test_data=is_test_data,
            event_type="provider_new_booking",
            user_id=user_id,
            db=db,
        )

    @classmethod
    def send_cancellation_email(
        cls,
        to_email: str,
        booking_code: str,
        service_title: str,
        refund_amount: float,
        is_test_data: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Send cancellation confirmation and refund breakdown email."""
        subject = f"Booking Cancelled: #{booking_code}"
        html = f"""
        <div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;'>
            <h2 style='color: #dc2626; margin-top: 0;'>Reservation Cancelled</h2>
            <p>Your booking for <strong>{service_title}</strong> (#{booking_code}) has been cancelled.</p>
            <div style='background: #fef2f2; padding: 16px; border-radius: 10px; border: 1px solid #fee2e2; margin: 18px 0;'>
                <p style='margin: 4px 0;'><strong>Booking Code:</strong> {booking_code}</p>
                <p style='margin: 4px 0;'><strong>Eligible Refund Amount:</strong> ₹{refund_amount:,.2f}</p>
            </div>
            <p>Refunds are initiated back to the original payment source within 5-7 business days.</p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b; margin: 0;'>NammaConnect Technologies Pvt Ltd, Bengaluru, Karnataka</p>
        </div>
        """
        return cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            is_test_data=is_test_data,
            event_type="booking_cancelled",
            user_id=user_id,
            db=db,
        )

    # =========================================================================
    # Payment Emails
    # =========================================================================

    @classmethod
    def send_payment_success_email(
        cls,
        to_email: str,
        booking_code: str,
        amount: float,
        service_title: str,
        payment_id: str,
        is_test_data: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Send payment success receipt to customer."""
        subject = f"Payment Successful: #{booking_code}"
        html = f"""
        <div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;'>
            <h2 style='color: #047857; margin-top: 0;'>Payment Received</h2>
            <p>We have successfully processed your payment for <strong>{service_title}</strong>.</p>
            <div style='background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; margin: 18px 0;'>
                <p style='margin: 4px 0;'><strong>Booking Code:</strong> #{booking_code}</p>
                <p style='margin: 4px 0;'><strong>Payment ID:</strong> {payment_id}</p>
                <p style='margin: 4px 0;'><strong>Amount Paid:</strong> ₹{amount:,.2f}</p>
                <p style='margin: 4px 0;'><strong>Status:</strong> Completed (PAID)</p>
            </div>
            <p>Your reservation is now fully confirmed.</p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b; margin: 0;'>NammaConnect Technologies Pvt Ltd, Bengaluru, Karnataka</p>
        </div>
        """
        return cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            is_test_data=is_test_data,
            event_type="payment_success",
            user_id=user_id,
            db=db,
        )

    @classmethod
    def send_payment_failed_email(
        cls,
        to_email: str,
        booking_code: str,
        amount: float,
        service_title: str,
        reason: Optional[str] = None,
        is_test_data: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Send payment failure notification to customer."""
        subject = f"Payment Failed: #{booking_code}"
        reason_text = reason or "Transaction was declined by the issuing bank or payment gateway."

        html = f"""
        <div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;'>
            <h2 style='color: #dc2626; margin-top: 0;'>Payment Not Completed</h2>
            <p>Your payment attempt of ₹{amount:,.2f} for booking <strong>{service_title}</strong> (#{booking_code}) could not be completed.</p>
            <div style='background: #fef2f2; padding: 16px; border-radius: 10px; border: 1px solid #fee2e2; margin: 18px 0;'>
                <p style='margin: 4px 0;'><strong>Reason:</strong> {reason_text}</p>
            </div>
            <p>No funds were captured from your account. You can retry the payment in the <strong>My Bookings</strong> section of your app.</p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b; margin: 0;'>NammaConnect Technologies Pvt Ltd, Bengaluru, Karnataka</p>
        </div>
        """
        return cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            is_test_data=is_test_data,
            event_type="payment_failed",
            user_id=user_id,
            db=db,
        )

    # =========================================================================
    # Collaboration Emails
    # =========================================================================

    @classmethod
    def send_collaboration_email(
        cls,
        to_email: str,
        recipient_name: str,
        proposal_title: str,
        sender_name: str,
        status_text: str = "received",
        is_test_data: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Send creator / provider collaboration status update."""
        subject = f"Collaboration Update: {proposal_title}"
        html = f"""
        <div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;'>
            <h2 style='color: #047857; margin-top: 0;'>Collaboration Proposal {status_text.capitalize()}</h2>
            <p>Hello {recipient_name},</p>
            <p>You have an update on the collaboration proposal <strong>{proposal_title}</strong> with <strong>{sender_name}</strong>.</p>
            <p>Status: <strong>{status_text.upper()}</strong></p>
            <p>Please log in to your Creator / Partner Studio to review terms and respond.</p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b; margin: 0;'>NammaConnect Technologies Pvt Ltd, Bengaluru, Karnataka</p>
        </div>
        """
        return cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            is_test_data=is_test_data,
            event_type="collaboration",
            user_id=user_id,
            db=db,
        )

    # =========================================================================
    # Trip Reminder Emails
    # =========================================================================

    @classmethod
    def send_trip_reminder_email(
        cls,
        to_email: str,
        booking_code: str,
        service_title: str,
        start_date: str,
        location: str,
        is_test_data: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Send automated 24-hour upcoming trip reminder email."""
        subject = "Your NammaConnect trip is tomorrow"
        html = f"""
        <div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;'>
            <h2 style='color: #047857; margin-top: 0;'>Your NammaConnect Journey Begins Soon!</h2>
            <p>This is a friendly reminder that your stay/experience <strong>{service_title}</strong> is scheduled for tomorrow (<strong>{start_date}</strong>).</p>
            <div style='background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; margin: 18px 0;'>
                <p style='margin: 4px 0;'><strong>Booking Code:</strong> {booking_code}</p>
                <p style='margin: 4px 0;'><strong>Location:</strong> {location}</p>
            </div>
            <p>Have safe travels and enjoy authentic Karnataka farm living!</p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b; margin: 0;'>NammaConnect Technologies Pvt Ltd, Bengaluru, Karnataka</p>
        </div>
        """
        return cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            is_test_data=is_test_data,
            event_type="trip_reminder",
            user_id=user_id,
            db=db,
        )

    # =========================================================================
    # Provider Application Emails
    # =========================================================================

    @classmethod
    def send_provider_application_received(
        cls,
        to_email: str,
        full_name: str,
        application_code: str,
        role_type: str,
        is_test_data: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Send provider application received confirmation."""
        subject = "Provider Application Received"
        html = f"""
        <div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;'>
            <h2 style='color: #047857; margin-top: 0;'>Application Received</h2>
            <p>Namaskara {full_name},</p>
            <p>Thank you for applying to become a verified {role_type.title()} partner on NammaConnect.</p>
            <div style='background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; margin: 18px 0;'>
                <p style='margin: 4px 0;'><strong>Application Code:</strong> #{application_code}</p>
                <p style='margin: 4px 0;'><strong>Status:</strong> Under Verification</p>
            </div>
            <p>Our verification team reviews property permits, identity documents, and quality standards within 24-48 business hours.</p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b; margin: 0;'>NammaConnect Technologies Pvt Ltd, Bengaluru, Karnataka</p>
        </div>
        """
        return cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            is_test_data=is_test_data,
            event_type="provider_application_received",
            user_id=user_id,
            db=db,
        )

    @classmethod
    def send_provider_application_approved(
        cls,
        to_email: str,
        full_name: str,
        application_code: str,
        is_test_data: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Send provider application approval notification."""
        subject = "Provider Application Approved"
        html = f"""
        <div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;'>
            <h2 style='color: #047857; margin-top: 0;'>Congratulations! Your Application Is Approved</h2>
            <p>Namaskara {full_name},</p>
            <p>Your NammaConnect partner application (#{application_code}) has been verified and approved!</p>
            <p>You can now log in to the <strong>Partner Studio</strong> to publish your farm stays, workshops, or activities, and start hosting travelers across Karnataka.</p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b; margin: 0;'>NammaConnect Technologies Pvt Ltd, Bengaluru, Karnataka</p>
        </div>
        """
        return cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            is_test_data=is_test_data,
            event_type="provider_application_approved",
            user_id=user_id,
            db=db,
        )

    @classmethod
    def send_provider_application_rejected(
        cls,
        to_email: str,
        full_name: str,
        application_code: str,
        reason: str,
        is_test_data: bool = False,
        user_id: Optional[uuid.UUID] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Send provider application rejection notification."""
        subject = "Provider Application Rejected"
        html = f"""
        <div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 28px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;'>
            <h2 style='color: #dc2626; margin-top: 0;'>Partner Application Status Update</h2>
            <p>Namaskara {full_name},</p>
            <p>Thank you for your interest in partnering with NammaConnect. At this time, your application (#{application_code}) could not be approved for the following reason:</p>
            <div style='background: #fef2f2; padding: 16px; border-radius: 10px; border: 1px solid #fee2e2; margin: 18px 0;'>
                <p style='margin: 4px 0;'><strong>Reason:</strong> {reason}</p>
            </div>
            <p>You are welcome to update your documentation and re-apply through the Partner Portal.</p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b; margin: 0;'>NammaConnect Technologies Pvt Ltd, Bengaluru, Karnataka</p>
        </div>
        """
        return cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            is_test_data=is_test_data,
            event_type="provider_application_rejected",
            user_id=user_id,
            db=db,
        )
