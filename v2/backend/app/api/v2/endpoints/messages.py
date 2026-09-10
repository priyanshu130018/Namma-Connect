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
from app.core.rate_limiter import rate_limit

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


@router.post(
    "/send",
    response_model=APIResponse[ChatMessageResponse],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=40, window_seconds=60, key_prefix="messages:send"))],
)
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


# ============================================================================
# Realtime WebSocket Endpoint for Chat & Presence
# ============================================================================

from fastapi import WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError
from app.core.config import settings
from app.services.redis_service import RedisService
import asyncio
import json

class ConnectionManager:
    """Manages active WebSockets for in-process broadcast and fallback."""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        # Update presence in Redis with 2-minute TTL
        RedisService.set(f"presence:{user_id}", {"online": True, "at": "now"}, expire_seconds=120)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                RedisService.delete(f"presence:{user_id}")

    async def send_personal_message(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            for conn in self.active_connections[user_id]:
                try:
                    await conn.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    token: str = Query(None),
):
    """Real-time bi-directional messaging and presence WebSocket."""
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id or payload.get("type") == "refresh":
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(user_id, websocket)

    # Background task to refresh presence heartbeat
    async def presence_heartbeat():
        try:
            while True:
                await asyncio.sleep(60)
                RedisService.set(f"presence:{user_id}", {"online": True}, expire_seconds=120)
        except asyncio.CancelledError:
            pass

    heartbeat_task = asyncio.create_task(presence_heartbeat())

    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming ping / messages
            try:
                msg_data = json.loads(data)
                if msg_data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
        heartbeat_task.cancel()
    except Exception:
        manager.disconnect(user_id, websocket)
        heartbeat_task.cancel()

