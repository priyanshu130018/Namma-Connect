"""Security policies, authorization guards, and hallucination protections for Namma AI."""

from datetime import datetime
import re
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.modules.marketplace.domain.models import Service, ServiceAvailability
from app.modules.trip.domain.models import Trip
from app.modules.user.domain.models import User


class PolicyEnforcementError(PermissionError):
    """Raised when an agent operation violates security or authorization policy."""
    pass


BOOKING_INTENT_PATTERNS = [
    r"\bbook\s+(?:this\s+)?trip\b",
    r"\bbook\b\s+(?:it|this|them|all|everything|now)",
    r"\bgo\s+ahead\s+and\s+book\b",
    r"\bplease\s+book\b",
    r"\bconfirm\s+booking\b",
    r"\bmake\s+the\s+booking\b",
    r"\bproceed\s+with\s+(?:the\s+)?booking\b",
    r"\bcomplete\s+(?:the\s+)?booking\b",
    r"\bconfirm\s+and\s+book\b",
    r"\bi\s+want\s+to\s+book\b",
    r"\bready\s+to\s+book\b",
]


class AgentPolicies:
    """Policy rules ensuring safety, strict authorization, and zero hallucination."""

    @staticmethod
    def is_explicit_booking_intent(text: str) -> bool:
        """Check if user has explicitly requested booking or booking readiness.
        
        Strictly rejects exploratory phrases, questions, and plan-adding requests.
        """
        if not text:
            return False
        clean = text.lower().strip()

        # Questions and exploratory prompts must NEVER trigger booking
        if "?" in clean:
            return False

        exploratory_phrases = [
            "which one", "should i", "can i", "could i", "what if", "would you",
            "tell me more", "before i book", "don't book", "do not book",
            "not ready to book", "how much", "how do i", "add to plan",
            "add to my plan", "add it to my plan", "show me", "recommend",
            "compare", "options for", "what are the", "can you show", "help me decide",
            "looks good", "looks nice", "booking options", "booking option", "options to book",
            "show booking"
        ]
        for phrase in exploratory_phrases:
            if phrase in clean:
                return False

        for pat in BOOKING_INTENT_PATTERNS:
            if re.search(pat, clean):
                return True

        return clean in [
            "book", "book it", "book this", "book this trip", "book everything", "go ahead and book",
            "book now", "please book", "confirm booking", "proceed with booking",
            "confirm and book", "confirm & book", "i want to book", "ready to book"
        ]

    @staticmethod
    def is_approval_confirmation(text: str) -> bool:
        """Check if user affirmatively confirmed a pending human-in-the-loop approval."""
        if not text:
            return False
        clean = re.sub(r"[^\w\s]", " ", text.lower()).strip()
        clean = " ".join(clean.split())
        affirmatives = [
            "yes", "yep", "yeah", "approve", "approved", "confirm", "confirmed",
            "proceed", "go ahead", "sounds good", "let's do it", "accept",
            "confirm booking", "yes please", "yes proceed", "i approve", "please approve",
            "confirm and book", "confirm & book", "book it", "book it now", "proceed with booking",
            "yes proceed with booking", "yes i approve"
        ]
        return (
            clean in affirmatives
            or any(clean.startswith(a + " ") for a in affirmatives)
            or any(w in clean.split() for w in ["yes", "approve", "approved", "confirm", "confirmed"])
        )

    @staticmethod
    def is_approval_rejection(text: str) -> bool:
        """Check if user explicitly declined or postponed a pending approval."""
        if not text:
            return False
        clean = re.sub(r"[^\w\s]", " ", text.lower()).strip()
        clean = " ".join(clean.split())
        negatives = [
            "no", "nope", "reject", "rejected", "not now", "wait",
            "hold on", "stop", "keep searching", "change plan", "never mind",
            "don't", "do not", "modify trip", "modify this trip", "modify", "change dates"
        ]
        return (
            clean in negatives
            or any(clean.startswith(n + " ") for n in negatives)
            or any(w in clean.split() for w in ["reject", "rejected", "decline", "declined"])
        )


    @staticmethod
    def is_cancellation_intent(text: str) -> bool:
        """Check if user is requesting to cancel an existing booking or reservation."""
        if not text:
            return False
        clean = text.lower().strip()
        cancel_patterns = [
            r"\bcancel\s+(?:my\s+)?booking\b",
            r"\bcancel\s+(?:the\s+)?reservation\b",
            r"\bcancel\s+#?[a-z0-9-]+\b",
            r"\brefund\s+(?:my\s+)?booking\b",
        ]
        return any(re.search(p, clean) for p in cancel_patterns) or clean in ["cancel booking", "cancel reservation"]

    @staticmethod
    def is_modification_intent(text: str) -> bool:
        """Check if user is requesting to modify an existing booking."""
        if not text:
            return False
        clean = text.lower().strip()
        mod_patterns = [
            r"\bchange\s+(?:my\s+)?dates?\b",
            r"\bmodify\s+(?:my\s+)?booking\b",
            r"\breschedule\b",
            r"\bchange\s+(?:number\s+of\s+)?guests?\b",
        ]
        return any(re.search(p, clean) for p in mod_patterns)

    @staticmethod
    def verify_trip_ownership(db: Session, user: User, trip_id: str) -> Trip:
        """Verify the user owns the target trip container."""
        try:
            t_uuid = uuid.UUID(str(trip_id))
        except ValueError:
            raise PolicyEnforcementError(f"Invalid trip UUID: '{trip_id}'")

        trip = db.query(Trip).filter(Trip.id == t_uuid).first()
        if not trip:
            raise PolicyEnforcementError("Trip not found.")
        user_role = getattr(user, "role", "")
        is_admin = str(user_role).lower() == "admin"
        if str(trip.user_id) != str(user.id) and not is_admin:
            raise PolicyEnforcementError("User is not authorized to modify this trip.")
        return trip

    @staticmethod
    def verify_real_service(db: Session, service_id: str) -> Service:
        """Ensure service ID corresponds to an authoritative database record (no hallucinated IDs)."""
        try:
            s_uuid = uuid.UUID(str(service_id))
        except ValueError:
            raise PolicyEnforcementError(f"Invalid service UUID: '{service_id}'")

        service = db.query(Service).filter(Service.id == s_uuid).first()
        if not service:
            raise PolicyEnforcementError(f"Service with ID '{service_id}' does not exist in the marketplace.")
        if service.status != "PUBLISHED":
            raise PolicyEnforcementError(f"Service '{service.title}' is not active or published.")
        if service.provider_id:
            provider = db.query(User).filter(User.id == service.provider_id).first()
            if provider and not getattr(provider, "is_active", True):
                raise PolicyEnforcementError(f"Provider for service '{service.title}' is inactive or suspended.")
        return service

    @staticmethod
    def verify_real_availability(
        db: Session,
        service_id: str,
        start_date: Optional[str] = None,
        date: Optional[str] = None,
        guests_count: int = 1,
    ) -> Dict[str, Any]:
        """Verify factual availability from database without fabrication."""
        target_date = start_date or date or datetime.utcnow().strftime("%Y-%m-%d")
        try:
            s_uuid = uuid.UUID(str(service_id))
        except ValueError:
            raise PolicyEnforcementError(f"Invalid service UUID: '{service_id}'")

        svc = db.query(Service).filter(Service.id == s_uuid).first()
        if not svc:
            raise PolicyEnforcementError(f"Service with ID '{service_id}' does not exist in the marketplace.")

        avail = (
            db.query(ServiceAvailability)
            .filter(
                ServiceAvailability.service_id == s_uuid,
                ServiceAvailability.date == target_date,
            )
            .first()
        )

        if avail:
            if avail.is_blocked:
                return {
                    "available": False,
                    "reason": f"Date slot {target_date} is blocked by host.",
                    "available_spots": 0,
                    "date": target_date,
                }
            remaining = avail.capacity - avail.booked_count
            if guests_count > remaining:
                return {
                    "available": False,
                    "reason": f"Insufficient capacity for {target_date}. Only {remaining} spots available.",
                    "available_spots": remaining,
                    "date": target_date,
                }
            return {
                "available": True,
                "price_override": float(avail.price_override) if avail.price_override is not None else None,
                "available_spots": remaining,
                "date": target_date,
            }

        # If no slot row, verify listing max_capacity
        if svc.max_capacity and guests_count > svc.max_capacity:
            return {
                "available": False,
                "reason": f"Requested guests ({guests_count}) exceed listing max capacity ({svc.max_capacity}).",
                "available_spots": svc.max_capacity,
                "date": target_date,
            }

        return {
            "available": True,
            "available_spots": getattr(svc, "max_capacity", 20) or 20,
            "price_override": None,
            "date": target_date,
        }
