"""Endpoints for Multi-Party Conversations and Chat Messages."""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.message import (
    MessageResponse as ChatMessageResponse,
    ConversationResponse,
    ConversationDetailResponse,
    MessageSendRequest,
)
from app.services.communication import MessagingService

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.get("/conversations", response_model=APIResponse[List[ConversationResponse]])
def list_my_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all conversations involving the authenticated user."""
    convs = MessagingService.list_user_conversations(db, current_user)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(convs)} conversations",
        data=convs,
    )


@router.get("/conversations/{conversation_id}", response_model=APIResponse[ConversationDetailResponse])
def get_conversation_thread(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve message history for a conversation and mark incoming messages as read."""
    res = MessagingService.get_conversation_thread(db, current_user, conversation_id)
    return APIResponse(
        success=True,
        message="Conversation thread retrieved successfully",
        data=res,
    )


@router.post("/send", response_model=APIResponse[ChatMessageResponse], status_code=status.HTTP_201_CREATED)
def send_chat_message(
    payload: MessageSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message within an existing conversation or start a new thread."""
    msg = MessagingService.send_message(db, current_user, payload)
    return APIResponse(
        success=True,
        message="Message sent successfully",
        data=msg,
    )
