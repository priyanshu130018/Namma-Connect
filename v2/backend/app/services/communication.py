"""Notification and Messaging Domain Services."""

import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.notification import Notification
from app.models.message import Conversation, Message
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
)
from app.schemas.message import (
    MessageResponse as ChatMessageResponse,
    ConversationResponse,
    ConversationDetailResponse,
    MessageSendRequest,
)


class NotificationService:
    """Business logic for User Notifications and Unread Badges."""

    @classmethod
    def _to_notification_response(cls, n: Notification) -> NotificationResponse:
        is_del = getattr(n, "is_deletable", True)
        if n.title == "Welcome to Namma Connect":
            is_del = False
        return NotificationResponse(
            id=str(n.id),
            user_id=str(n.user_id),
            title=n.title,
            message=n.message,
            type=n.type,
            resource_type=n.resource_type,
            resource_id=n.resource_id,
            is_read=n.is_read,
            is_deletable=is_del,
            created_at=n.created_at,
        )

    @classmethod
    def ensure_seeded(cls, db: Session, user: User):
        """No-op: Never inject fake notifications into runtime database."""
        pass

    @classmethod
    def list_user_notifications(cls, db: Session, user: User, sort_by: Optional[str] = "newest") -> NotificationListResponse:
        """List notifications belonging strictly to the authenticated user."""
        query = db.query(Notification).filter(Notification.user_id == user.id)

        if sort_by == "oldest":
            query = query.order_by(Notification.created_at.asc())
        elif sort_by in ["name_asc", "title_asc"]:
            query = query.order_by(Notification.title.asc())
        elif sort_by in ["name_desc", "title_desc"]:
            query = query.order_by(Notification.title.desc())
        else:
            query = query.order_by(Notification.created_at.desc())

        notifs = query.all()
        unread_count = sum(1 for n in notifs if not n.is_read)
        return NotificationListResponse(
            notifications=[cls._to_notification_response(n) for n in notifs],
            unread_count=unread_count,
        )

    @classmethod
    def mark_notification_read(cls, db: Session, user: User, notification_id: str) -> NotificationResponse:
        """Mark single notification as read."""
        notif = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        ).first()
        if not notif:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found.",
            )
        notif.is_read = True
        db.commit()
        db.refresh(notif)
        return cls._to_notification_response(notif)

    @classmethod
    def mark_all_read(cls, db: Session, user: User) -> int:
        """Mark all unread notifications as read for authenticated user."""
        unread_notifs = db.query(Notification).filter(
            Notification.user_id == user.id,
            Notification.is_read == False,
        ).all()
        for n in unread_notifs:
            n.is_read = True
        db.commit()
        return len(unread_notifs)

    @classmethod
    def delete_notification(cls, db: Session, user: User, notification_id: str) -> bool:
        """Delete notification for user, respecting non-deletable protection."""
        notif = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        ).first()

        if not notif:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found.",
            )

        if not getattr(notif, "is_deletable", True) or notif.title == "Welcome to Namma Connect":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Welcome to Namma Connect system notification cannot be deleted.",
            )

        db.delete(notif)
        db.commit()
        return True

    @classmethod
    def create_notification(
        cls,
        db: Session,
        user_id: uuid.UUID,
        title: str,
        message: str,
        type: str = "system",
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        is_deletable: bool = True,
    ) -> NotificationResponse:
        """Dispatch and persist a new notification for a specific user."""
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            resource_type=resource_type,
            resource_id=resource_id,
            is_read=False,
            is_deletable=is_deletable,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return cls._to_notification_response(notif)



class MessagingService:
    """Business logic for Conversations, Multi-Party Threads, and Messages."""

    @classmethod
    def _to_conversation_response(cls, conv: Conversation, user_id: uuid.UUID, db: Optional[Session] = None) -> ConversationResponse:
        is_p1 = conv.participant1_id == user_id
        other_id = str(conv.participant2_id if is_p1 else conv.participant1_id)
        other_name = conv.participant2_name if is_p1 else conv.participant1_name
        unread = conv.unread_count_p1 if is_p1 else conv.unread_count_p2

        # Check online status via Redis presence cache
        from app.services.redis_service import RedisService
        presence = RedisService.get(f"presence:{other_id}")
        is_online = bool(presence)

        # Retrieve participant avatar if db available
        avatar_url = None
        if db:
            other_user = db.query(User).filter(User.id == other_id).first()
            if other_user:
                avatar_url = other_user.avatar_url

        return ConversationResponse(
            id=str(conv.id),
            participant_id=other_id,
            participant_name=other_name,
            participant_avatar=avatar_url,
            is_online=is_online,
            subject=conv.subject,
            last_message_text=conv.last_message_text,
            last_message_at=conv.last_message_at,
            unread_count=unread,
            created_at=conv.created_at,
        )

    @classmethod
    def _to_message_response(cls, m: Message) -> ChatMessageResponse:
        return ChatMessageResponse(
            id=str(m.id),
            conversation_id=str(m.conversation_id),
            sender_id=str(m.sender_id),
            sender_name=m.sender_name,
            content=m.content,
            is_read=m.is_read,
            created_at=m.created_at,
        )

    @classmethod
    def ensure_seeded(cls, db: Session, user: User):
        """No-op: Never inject fake conversations or messages into runtime database."""
        pass

    @classmethod
    def list_user_conversations(cls, db: Session, user: User) -> List[ConversationResponse]:
        """List all conversation threads involving the authenticated user."""
        convs = (
            db.query(Conversation)
            .filter((Conversation.participant1_id == user.id) | (Conversation.participant2_id == user.id))
            .order_by(Conversation.last_message_at.desc())
            .all()
        )
        return [cls._to_conversation_response(c, user.id, db) for c in convs]



    @classmethod
    def get_conversation_thread(cls, db: Session, user: User, conversation_id: str) -> ConversationDetailResponse:
        """Fetch message thread and mark messages read for authenticated participant."""
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

        if user.id not in [conv.participant1_id, conv.participant2_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant in this conversation.",
            )

        # Mark unread counter 0 for this user
        if conv.participant1_id == user.id:
            conv.unread_count_p1 = 0
        else:
            conv.unread_count_p2 = 0

        # Mark incoming messages as read
        unread_msgs = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id, Message.sender_id != user.id, Message.is_read == False)
            .all()
        )
        for m in unread_msgs:
            m.is_read = True

        db.commit()

        messages = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id)
            .order_by(Message.created_at.asc())
            .all()
        )

        return ConversationDetailResponse(
            conversation=cls._to_conversation_response(conv, user.id),
            messages=[cls._to_message_response(m) for m in messages],
        )

    @classmethod
    def send_message(cls, db: Session, user: User, payload: MessageSendRequest) -> ChatMessageResponse:
        """Send message in existing conversation or initiate new conversation."""
        conv = None
        if payload.conversation_id:
            conv = db.query(Conversation).filter(Conversation.id == payload.conversation_id).first()
            if not conv:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
            if user.id not in [conv.participant1_id, conv.participant2_id]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to send messages in this conversation.",
                )
        elif payload.recipient_id:
            recipient = db.query(User).filter(User.id == payload.recipient_id).first()
            if not recipient:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient user not found.")

            # Look for existing conversation between them
            conv = (
                db.query(Conversation)
                .filter(
                    ((Conversation.participant1_id == user.id) & (Conversation.participant2_id == recipient.id))
                    | ((Conversation.participant1_id == recipient.id) & (Conversation.participant2_id == user.id))
                )
                .first()
            )
            if not conv:
                conv = Conversation(
                    participant1_id=user.id,
                    participant1_name=user.full_name,
                    participant2_id=recipient.id,
                    participant2_name=recipient.full_name,
                    subject=payload.subject or "Direct Host Inquiry",
                    last_message_text=payload.content,
                    last_message_at=datetime.utcnow(),
                    unread_count_p1=0,
                    unread_count_p2=1,
                )
                db.add(conv)
                db.flush()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'conversation_id' or 'recipient_id' must be provided.",
            )

        # Create message
        msg = Message(
            conversation_id=conv.id,
            sender_id=user.id,
            sender_name=user.full_name,
            content=payload.content,
            is_read=False,
        )
        db.add(msg)

        # Update conversation meta
        conv.last_message_text = payload.content
        conv.last_message_at = datetime.utcnow()
        recipient_id = conv.participant2_id if conv.participant1_id == user.id else conv.participant1_id
        if conv.participant1_id == user.id:
            conv.unread_count_p2 += 1
        else:
            conv.unread_count_p1 += 1

        db.commit()
        db.refresh(msg)

        msg_resp = cls._to_message_response(msg)

        # Real-time event broadcast via Redis pub/sub
        try:
            from app.services.redis_service import RedisService
            channel_payload = {
                "type": "new_message",
                "conversation_id": str(conv.id),
                "message": {
                    "id": str(msg.id),
                    "conversation_id": str(msg.conversation_id),
                    "sender_id": str(msg.sender_id),
                    "sender_name": msg.sender_name,
                    "content": msg.content,
                    "is_read": msg.is_read,
                    "created_at": msg.created_at.isoformat() if msg.created_at else None,
                },
            }
            RedisService.publish(f"chat:{recipient_id}", channel_payload)
        except Exception:
            pass

        # Dispatch an in-app notification to the recipient
        try:
            NotificationService.create_notification(
                db=db,
                user_id=recipient_id,
                title=f"New message from {user.full_name}",
                message=payload.content[:120],
                type="system",
                resource_type="service",
                resource_id=str(conv.id),
            )
        except Exception:
            pass

        return msg_resp

