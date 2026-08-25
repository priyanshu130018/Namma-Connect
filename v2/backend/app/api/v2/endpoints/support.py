"""Endpoints for Customer Support Tickets and Grievance Redressal."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.support import (
    SupportTicketCreateRequest,
    SupportTicketReplyRequest,
    SupportTicketResponse,
    SupportTicketListResponse,
)
from app.services.support import SupportService

router = APIRouter(prefix="/support", tags=["Support"])


@router.post("/tickets", response_model=APIResponse[SupportTicketResponse], status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    payload: SupportTicketCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create and submit a new customer support ticket."""
    ticket = SupportService.create_ticket(db, current_user, payload)
    return APIResponse(
        success=True,
        message="Support ticket submitted successfully",
        data=ticket,
    )


@router.get("/tickets", response_model=APIResponse[SupportTicketListResponse])
def list_my_support_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all support tickets created by the authenticated user."""
    res = SupportService.list_user_tickets(db, current_user)
    return APIResponse(
        success=True,
        message=f"Retrieved {res.total} support tickets",
        data=res,
    )


@router.get("/tickets/{ticket_id}", response_model=APIResponse[SupportTicketResponse])
def get_support_ticket_detail(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full details and thread history for a support ticket."""
    ticket = SupportService.get_user_ticket(db, current_user, ticket_id)
    return APIResponse(
        success=True,
        message="Support ticket retrieved successfully",
        data=ticket,
    )


@router.post("/tickets/{ticket_id}/reply", response_model=APIResponse[SupportTicketResponse])
def reply_to_support_ticket(
    ticket_id: str,
    payload: SupportTicketReplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer submits a follow-up response to an active support ticket."""
    ticket = SupportService.customer_reply(db, current_user, ticket_id, payload.message)
    return APIResponse(
        success=True,
        message="Response added to support ticket",
        data=ticket,
    )
