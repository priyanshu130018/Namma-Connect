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
        return NotificationResponse(
            id=str(n.id),
            user_id=str(n.user_id),
            title=n.title,
            message=n.message,
            type=n.type,
            resource_type=n.resource_type,
            resource_id=n.resource_id,
            is_read=n.is_read,
            created_at=n.created_at,
        )

    @classmethod
    def ensure_seeded(cls, db: Session, user: User):
        """Seed initial real event notifications for the user if empty."""
        count = db.query(Notification).filter(Notification.user_id == user.id).count()
        if count > 0:
            return

        seed_items = [
            {
                "title": "Booking Confirmed: Highland Arabica Coffee Estate",
                "message": "Your stay in Coorg is confirmed. Your check-in pass and digital itinerary are ready.",
                "type": "booking",
                "resource_type": "booking",
                "resource_id": "NC-BKG-SAMPLE-01",
                "is_read": False,
            },
            {
                "title": "Payment Successful",
                "message": "Payment of ₹18,000 for your plantation retreat booking has been authorized and verified.",
                "type": "payment",
                "resource_type": "booking",
                "resource_id": "NC-BKG-SAMPLE-01",
                "is_read": False,
            },
            {
                "title": "UIDAI Identity KYC Verified",
                "message": "Your identity and government verification documents have been approved by NammaConnect Compliance.",
                "type": "system",
                "resource_type": None,
                "resource_id": None,
                "is_read": True,
            },
        ]

        for item in seed_items:
            notif = Notification(
                user_id=user.id,
                title=item["title"],
                message=item["message"],
                type=item["type"],
                resource_type=item["resource_type"],
                resource_id=item["resource_id"],
                is_read=item["is_read"],
            )
            db.add(notif)
        db.commit()

    @classmethod
    def list_user_notifications(cls, db: Session, user: User) -> NotificationListResponse:
        """List notifications belonging strictly to the authenticated user."""
        cls.ensure_seeded(db, user)
        notifs = (
            db.query(Notification)
            .filter(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .all()
        )
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
    def create_notification(
        cls,
        db: Session,
        user_id: uuid.UUID,
        title: str,
        message: str,
        type: str = "system",
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
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
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return cls._to_notification_response(notif)


class MessagingService:
    """Business logic for Conversations, Multi-Party Threads, and Messages."""

    @classmethod
    def _to_conversation_response(cls, conv: Conversation, user_id: uuid.UUID) -> ConversationResponse:
        is_p1 = conv.participant1_id == user_id
        other_id = str(conv.participant2_id if is_p1 else conv.participant1_id)
        other_name = conv.participant2_name if is_p1 else conv.participant1_name
        unread = conv.unread_count_p1 if is_p1 else conv.unread_count_p2

        return ConversationResponse(
            id=str(conv.id),
            participant_id=other_id,
            participant_name=other_name,
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
        """Seed initial realistic conversations and message history for testing."""
        count = db.query(Conversation).filter(
            (Conversation.participant1_id == user.id) | (Conversation.participant2_id == user.id)
        ).count()
        if count > 0:
            return

        partner_id = uuid.uuid4()
        partner_name = "Somanna (Kodagu Organics Host)"

        conv = Conversation(
            participant1_id=user.id,
            participant1_name=user.full_name,
            participant2_id=partner_id,
            participant2_name=partner_name,
            subject="Highland Arabica Coffee Estate Stay",
            last_message_text="Yes, traditional Akki Rotti and freshly roasted estate filter coffee are included!",
            last_message_at=datetime.utcnow(),
            unread_count_p1=1,
            unread_count_p2=0,
        )
        db.add(conv)
        db.flush()

        messages = [
            Message(
                conversation_id=conv.id,
                sender_id=partner_id,
                sender_name=partner_name,
                content=f"Namaskara {user.full_name}! We have reserved the Heritage Cottage for your upcoming dates.",
                is_read=True,
            ),
            Message(
                conversation_id=conv.id,
                sender_id=user.id,
                sender_name=user.full_name,
                content="Thank you Somanna! Will there be estate breakfast included?",
                is_read=True,
            ),
            Message(
                conversation_id=conv.id,
                sender_id=partner_id,
                sender_name=partner_name,
                content="Yes, traditional Akki Rotti and freshly roasted estate filter coffee are included!",
                is_read=False,
            ),
        ]
        db.add_all(messages)
        db.commit()

    @classmethod
    def list_user_conversations(cls, db: Session, user: User) -> List[ConversationResponse]:
        """List all conversation threads involving the authenticated user."""
        cls.ensure_seeded(db, user)
        convs = (
            db.query(Conversation)
            .filter((Conversation.participant1_id == user.id) | (Conversation.participant2_id == user.id))
            .order_by(Conversation.last_message_at.desc())
            .all()
        )
        return [cls._to_conversation_response(c, user.id) for c in convs]

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
        if conv.participant1_id == user.id:
            conv.unread_count_p2 += 1
        else:
            conv.unread_count_p1 += 1

        db.commit()
        db.refresh(msg)
        return cls._to_message_response(msg)
