"""Support Ticket Domain Service."""

import json
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.booking import Booking
from app.models.support import SupportTicket
from app.schemas.support import (
    TicketReplyItem,
    SupportTicketCreateRequest,
    SupportTicketResponse,
    SupportTicketListResponse,
    PublicContactRequest,
    PublicContactResponse,
)
from app.schemas.admin import AdminSupportTicketItem
from app.services.communication import NotificationService


class SupportService:
    """Business logic for Customer Support Tickets and Admin Inquiries."""

    @classmethod
    def _to_ticket_response(cls, t: SupportTicket) -> SupportTicketResponse:
        try:
            raw_replies = json.loads(t.responses_json or "[]")
            replies = [TicketReplyItem(**r) for r in raw_replies]
        except Exception:
            replies = []

        return SupportTicketResponse(
            id=str(t.id),
            ticket_code=t.ticket_code,
            user_id=str(t.user_id),
            user_name=t.user_name,
            user_email=t.user_email,
            booking_id=t.booking_id,
            category=t.category,
            subject=t.subject,
            description=t.description,
            status=t.status,
            priority=t.priority,
            responses=replies,
            created_at=t.created_at,
            updated_at=t.updated_at,
            resolved_at=t.resolved_at,
        )

    @classmethod
    def ensure_seeded(cls, db: Session):
        """No-op: Support tickets are submitted dynamically."""
        pass

    @classmethod
    def create_ticket(
        cls,
        db: Session,
        user: User,
        payload: SupportTicketCreateRequest,
    ) -> SupportTicketResponse:
        """Create and submit a customer support ticket."""

        # Validate booking ownership if booking_id supplied
        if payload.booking_id:
            booking = db.query(Booking).filter(
                (Booking.booking_code == payload.booking_id) | (Booking.id == payload.booking_id)
            ).first()
            if booking and booking.customer_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The specified booking does not belong to your account.",
                )

        ticket_code = f"NC-TICK-{uuid.uuid4().hex[:6].upper()}"
        ticket = SupportTicket(
            ticket_code=ticket_code,
            user_id=user.id,
            user_name=user.full_name,
            user_email=user.email,
            booking_id=payload.booking_id,
            category=payload.category,
            subject=payload.subject,
            description=payload.description,
            status="OPEN",
            priority="MEDIUM",
            responses_json=json.dumps([]),
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)

        # Dispatch automated user notification
        try:
            NotificationService.create_notification(
                db=db,
                user_id=user.id,
                title=f"Support Ticket Created: {ticket_code}",
                message=f"Your inquiry regarding '{payload.subject}' has been submitted. Our concierge team is on it.",
                type="system",
            )
        except Exception:
            pass

        return cls._to_ticket_response(ticket)

    @classmethod
    def list_user_tickets(cls, db: Session, user: User) -> SupportTicketListResponse:
        """List support tickets belonging strictly to authenticated customer."""
        tickets = (
            db.query(SupportTicket)
            .filter(SupportTicket.user_id == user.id)
            .order_by(SupportTicket.created_at.desc())
            .all()
        )
        return SupportTicketListResponse(
            tickets=[cls._to_ticket_response(t) for t in tickets],
            total=len(tickets),
        )

    @classmethod
    def get_user_ticket(cls, db: Session, user: User, ticket_id: str) -> SupportTicketResponse:
        """Retrieve customer ticket details with ownership guard."""
        ticket = db.query(SupportTicket).filter(
            (SupportTicket.id == ticket_id) | (SupportTicket.ticket_code == ticket_id)
        ).first()

        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support ticket not found.")

        if ticket.user_id != user.id and user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this support ticket.",
            )

        return cls._to_ticket_response(ticket)

    @classmethod
    def customer_reply(
        cls,
        db: Session,
        user: User,
        ticket_id: str,
        message: str,
    ) -> SupportTicketResponse:
        """Customer submits follow-up message to their ticket."""
        ticket = db.query(SupportTicket).filter(
            (SupportTicket.id == ticket_id) | (SupportTicket.ticket_code == ticket_id)
        ).first()

        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support ticket not found.")

        if ticket.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to reply to this ticket.",
            )

        try:
            replies = json.loads(ticket.responses_json or "[]")
        except Exception:
            replies = []

        new_reply = {
            "sender_name": user.full_name,
            "sender_role": "customer",
            "message": message,
            "created_at": datetime.utcnow().isoformat(),
        }
        replies.append(new_reply)
        ticket.responses_json = json.dumps(replies)

        if ticket.status in ["RESOLVED", "CLOSED"]:
            ticket.status = "IN_PROGRESS"

        db.commit()
        db.refresh(ticket)
        return cls._to_ticket_response(ticket)

    @classmethod
    def list_admin_tickets(
        cls,
        db: Session,
        status_filter: Optional[str] = None,
    ) -> List[AdminSupportTicketItem]:
        """List all platform support tickets for admin review."""
        query = db.query(SupportTicket)
        if status_filter:
            query = query.filter(SupportTicket.status == status_filter.upper())
        tickets = query.order_by(SupportTicket.created_at.desc()).all()

        return [
            AdminSupportTicketItem(
                id=t.ticket_code,
                user_email=t.user_email,
                user_name=t.user_name,
                subject=t.subject,
                category=t.category,
                status=t.status,
                priority=t.priority,
                created_at=t.created_at,
            )
            for t in tickets
        ]

    @classmethod
    def submit_public_contact(
        cls,
        db: Session,
        payload: PublicContactRequest,
    ) -> PublicContactResponse:
        """Submit a public inquiry or contact form message."""

        # Look up existing user by email or fallback to an existing system/admin/customer user for foreign key integrity
        user = db.query(User).filter(User.email == payload.email).first()
        if not user:
            # Check for admin or any registered user as systemic anchor
            user = db.query(User).filter(User.role.in_(["admin", "user", "provider"])).first()

        if not user:
            # In the rare event no user exists, create an anonymous inquiry anchor user
            anonymous_user = User(
                email="system-inquiries@nammaconnect.in",
                hashed_password="[SYSTEM_INQUIRY_ACCOUNT]",
                full_name="NammaConnect System",
                role="user",
                is_active=True,
                is_verified=True,
            )
            db.add(anonymous_user)
            db.commit()
            db.refresh(anonymous_user)
            user = anonymous_user

        ticket_code = f"NC-INQ-{uuid.uuid4().hex[:6].upper()}"
        ticket = SupportTicket(
            ticket_code=ticket_code,
            user_id=user.id,
            user_name=payload.name,
            user_email=payload.email,
            booking_id=None,
            category=payload.category,
            subject=payload.subject,
            description=payload.message,
            status="OPEN",
            priority="MEDIUM",
            responses_json=json.dumps([]),
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)

        return PublicContactResponse(
            ticket_code=ticket.ticket_code,
            name=payload.name,
            email=payload.email,
            subject=payload.subject,
            category=payload.category,
            message=payload.message,
            created_at=ticket.created_at,
        )
