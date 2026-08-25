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
        """Seed sample support tickets for admin and initial catalog if empty."""
        count = db.query(SupportTicket).count()
        if count > 0:
            return

        seed_data = [
            {
                "ticket_code": "NC-TICK-1001",
                "user_name": "Aravind Swamy",
                "user_email": "aravind@example.com",
                "booking_id": "NC-BKG-9921",
                "category": "Booking",
                "subject": "Inquiry regarding farm tour timings and check-in",
                "description": "Will early check-in be possible for our family at 11:00 AM instead of 1:00 PM?",
                "status": "OPEN",
                "priority": "MEDIUM",
                "responses_json": json.dumps([]),
            },
            {
                "ticket_code": "NC-TICK-1002",
                "user_name": "Plantation Host",
                "user_email": "host.plantation@example.com",
                "booking_id": None,
                "category": "Service",
                "subject": "Question about weekend availability calendar settings",
                "description": "How do I block specific slots for private harvesting events?",
                "status": "IN_PROGRESS",
                "priority": "LOW",
                "responses_json": json.dumps([
                    {
                        "sender_name": "NammaConnect Support Agent",
                        "sender_role": "admin",
                        "message": "You can block specific days under Partner Services > Edit Service > Weekly Schedule.",
                        "created_at": datetime.utcnow().isoformat(),
                    }
                ]),
            },
        ]

        for s in seed_data:
            ticket = SupportTicket(
                ticket_code=s["ticket_code"],
                user_id=uuid.uuid4(),
                user_name=s["user_name"],
                user_email=s["user_email"],
                booking_id=s["booking_id"],
                category=s["category"],
                subject=s["subject"],
                description=s["description"],
                status=s["status"],
                priority=s["priority"],
                responses_json=s["responses_json"],
            )
            db.add(ticket)
        db.commit()

    @classmethod
    def create_ticket(
        cls,
        db: Session,
        user: User,
        payload: SupportTicketCreateRequest,
    ) -> SupportTicketResponse:
        """Create and submit a customer support ticket."""
        cls.ensure_seeded(db)

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
        cls.ensure_seeded(db)
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
        cls.ensure_seeded(db)
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
        cls.ensure_seeded(db)
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
