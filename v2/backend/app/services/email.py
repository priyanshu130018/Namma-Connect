"""Resend Transactional Email Service for NammaConnect V2."""

import json
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.logging import logger


class EmailService:
    """Resend email integration handling transactional notifications with failure isolation."""

    @classmethod
    def is_configured(cls) -> bool:
        return bool(settings.RESEND_API_KEY)

    @classmethod
    def send_email(
        cls,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        from_email: str = "notifications@nammaconnect.in",
    ) -> Dict[str, Any]:
        """Send transactional email via Resend API. Failure will not raise exceptions that break transactions."""
        if not cls.is_configured():
            logger.info(f"[MOCK EMAIL] To: {to_email} | Subject: {subject}")
            return {"id": "mock_email_id", "status": "mock_sent", "to": to_email}

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
                return {"id": data.get("id"), "status": "sent", "to": to_email}
        except Exception as e:
            logger.warning(f"Resend email delivery failed for {to_email}: {e}")
            return {"id": None, "status": "failed", "error": str(e), "to": to_email}

    @classmethod
    def send_welcome_email(cls, to_email: str, full_name: str) -> Dict[str, Any]:
        """Send welcome email upon successful customer or partner registration."""
        subject = "Welcome to NammaConnect! Discover Authentic Rural Travel"
        html = f"""
        <div style='font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: auto;'>
            <h2 style='color: #047857;'>Welcome to NammaConnect, {full_name}!</h2>
            <p>We are thrilled to have you join our community celebrating authentic agricultural heritage, conscious farm stays, and rural creator storytelling.</p>
            <p>Start exploring verified farm tours, pottery workshops, and homestays today.</p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>
            <p style='font-size: 12px; color: #64748b;'>NammaConnect Technologies Pvt Ltd, Indiranagar, Bengaluru</p>
        </div>
        """
        return cls.send_email(to_email, subject, html)

    @classmethod
    def send_booking_confirmation_email(
        cls,
        to_email: str,
        booking_code: str,
        service_title: str,
        amount: float,
        start_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send booking confirmation receipt to traveler."""
        subject = f"Booking Confirmed: {service_title} [{booking_code}]"

        date_line = f"<p style='margin: 4px 0;'><strong>Scheduled Date:</strong> {start_date}</p>" if start_date else ""
        html = f"""
        <div style='font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: auto;'>
            <h2 style='color: #047857;'>Reservation Confirmed!</h2>
            <p>Your booking for <strong>{service_title}</strong> is confirmed and secured.</p>
            <div style='background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 16px 0;'>
                <p style='margin: 4px 0;'><strong>Booking Code:</strong> {booking_code}</p>
                <p style='margin: 4px 0;'><strong>Total Amount Paid:</strong> Rs. {amount:,.2f}</p>
                {date_line}
            </div>
            <p>You can view your directions, itinerary, and host messaging anytime inside the <strong>My Trip</strong> section of the app.</p>
        </div>
        """
        return cls.send_email(to_email, subject, html)

    @classmethod
    def send_provider_booking_notification(
        cls,
        to_email: str,
        provider_name: str,
        booking_code: str,
        service_title: str,
        customer_name: str,
    ) -> Dict[str, Any]:
        """Notify host provider of a newly confirmed guest booking."""
        subject = f"New Booking Received: {service_title} [{booking_code}]"
        html = f"""
        <div style='font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: auto;'>
            <h2 style='color: #047857;'>Hello {provider_name}, You Have a New Booking!</h2>
            <p>Guest <strong>{customer_name}</strong> has confirmed a reservation for <strong>{service_title}</strong>.</p>
            <p><strong>Booking Code:</strong> {booking_code}</p>
            <p>Please check your <strong>Partner Bookings Manifest</strong> to prepare for their arrival.</p>
        </div>
        """
        return cls.send_email(to_email, subject, html)

    @classmethod
    def send_collaboration_email(
        cls,
        to_email: str,
        recipient_name: str,
        proposal_title: str,
        sender_name: str,
        status_text: str = "received",
    ) -> Dict[str, Any]:
        """Send creator / provider collaboration status update."""
        subject = f"Collaboration Update: {proposal_title}"
        html = f"""
        <div style='font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: auto;'>
            <h2 style='color: #047857;'>Collaboration Proposal {status_text.capitalize()}</h2>
            <p>Hello {recipient_name},</p>
            <p>You have an update on the collaboration proposal <strong>{proposal_title}</strong> with <strong>{sender_name}</strong>.</p>
            <p>Please log in to your Creator / Partner Studio to review terms and respond.</p>
        </div>
        """
        return cls.send_email(to_email, subject, html)

    @classmethod
    def send_cancellation_email(
        cls,
        to_email: str,
        booking_code: str,
        service_title: str,
        refund_amount: float,
    ) -> Dict[str, Any]:
        """Send cancellation confirmation and refund breakdown email."""
        subject = f"Baoking Cancelled: #{booking_code}"
        html = f"""
        <div style='font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: auto;'>
            <h2 style='color: #dc2626;'>Reservation Cancelled</h2>
            <p>Your booking for <strong>{service_title}</strong> (#{booking_code}) has been cancelled.</p>
            <p><strong>Eligible Refund Amount:</strong> Rs. {refund_amount:,.2f}</p>
            <p>Refunds are initiated back to the original payment source within 5-7 business days.</p>
        </div>
        """
        return cls.send_email(to_email, subject, html)

    @classmethod
    def send_trip_reminder_email(
        cls,
        to_email: str,
        booking_code: str,
        service_title: str,
        start_date: str,
        location: str,
    ) -> Dict[str, Any]:
        """Send automated 24-hour upcoming trip reminder email."""
        subject = f"Upcoming Trip Reminder: {service_title} tomorrow!"
        html = f"""
        <div style='font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: auto;'>
            <h2 style='color: #047857;'>Your NammaConnect Journey Begins Soon!</h2>
            <p>This is a friendly reminder that your stay/experience <strong>{service_title}</strong> is scheduled for <strong>{start_date}</strong>.</p>
            <p><strong>Location:</strong> {location}</p>
            <p><strong>Booking Code:</strong> {booking_code}</p>
            <p>Have safe travels and enjoy authentic farm living!</p>
        </div>
        """
        return cls.send_email(to_email, subject, html)
