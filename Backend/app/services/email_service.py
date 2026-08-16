import resend
import logging
from app.core.config import settings

LOGGER = logging.getLogger(__name__)

if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY

class EmailService:
    @staticmethod
    def send_email(to: str, subject: str, body: str) -> dict:
        if not settings.RESEND_API_KEY:
            LOGGER.warning(f"[EMAIL MOCK] To: {to} | Subject: {subject} | Body: {body}")
            print(f"[EMAIL MOCK] To: {to} | Subject: {subject} | Body: {body}")
            return {"success": True, "mocked": True}
        
        try:
            params = {
                "from": "Namma Connect <onboarding@resend.dev>",
                "to": [to],
                "subject": subject,
                "html": f"<p>{body}</p>"
            }
            res = resend.Emails.send(params)
            return {"success": True, "id": getattr(res, "id", None)}
        except Exception as e:
            LOGGER.error(f"Resend email send error: {str(e)}")
            print(f"[EMAIL FALLBACK] To: {to} | Subject: {subject} | Body: {body} | Error: {str(e)}")
            return {"success": True, "mocked": True}

