from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional, List
from collections import defaultdict
from datetime import datetime, date as DateType
from sqlalchemy import or_

from app.models.user import Login, Profile, FarmerProfile, CreatorProfile, Notification, Message, ContactMessage
from app.models.wishlist import Wishlist
from app.schemas.user import (
    FarmerProfileOut, TouristOut, ProfileUpdate, ProfileOut,
    CreatorProfileOut, ContactCreate, ContactOut,
    MessageCreate, MessageOut
)

class UserService:
    @staticmethod
    def get_profile(db: Session, user_id: int) -> Profile:
        p = db.query(Profile).filter(Profile.user_id == user_id).first()
        if not p:
            p = Profile(user_id=user_id, country="India")
            db.add(p)
            db.commit()
            db.refresh(p)
        return p

    @staticmethod
    def update_profile(db: Session, user_id: int, data: ProfileUpdate) -> Profile:
        p = UserService.get_profile(db, user_id)
        login = db.query(Login).filter(Login.id == user_id).first()

        update_dict = data.model_dump(exclude_none=True)
        
        # Split fields that belong to Login vs Profile
        login_fields = {"name", "mobile", "email"}
        
        for k, v in update_dict.items():
            if k in login_fields:
                if login:
                    setattr(login, k, v)
            else:
                setattr(p, k, v)
        
        db.commit()
        db.refresh(p)
        if login:
            db.refresh(login)
        return p

    @staticmethod
    def get_farmer_profile(db: Session, user_id: int) -> FarmerProfile:
        f = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
        if not f:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found")
        return f

    @staticmethod
    def update_farmer_profile(db: Session, user_id: int, data: dict) -> FarmerProfile:
        f = UserService.get_farmer_profile(db, user_id)
        allowed_fields = {"farmer_id", "farm_experience_years", "farmer_category", "primary_crops"}
        for k, v in data.items():
            if k in allowed_fields and v is not None:
                setattr(f, k, v)
        db.commit()
        db.refresh(f)
        return f

    @staticmethod
    def get_creator_profile(db: Session, user_id: int) -> CreatorProfile:
        c = db.query(CreatorProfile).filter(CreatorProfile.user_id == user_id).first()
        if not c:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Creator profile not found")
        return c

    @staticmethod
    def update_creator_profile(db: Session, user_id: int, data: dict) -> CreatorProfile:
        c = UserService.get_creator_profile(db, user_id)
        allowed_fields = {
            "display_name", "bio", "category", "experience_years", "languages",
            "instagram_url", "facebook_url", "youtube_url", "portfolio_url"
        }
        for k, v in data.items():
            if k in allowed_fields and v is not None:
                setattr(c, k, v)
        db.commit()
        db.refresh(c)
        return c

    @staticmethod
    def list_creators(db: Session, query: Optional[str] = None, category: Optional[str] = None) -> List[CreatorProfile]:
        q = db.query(CreatorProfile).filter(CreatorProfile.verification_status == "approved")
        if category:
            q = q.filter(CreatorProfile.category.ilike(f"%{category}%"))
        if query:
            search_pattern = f"%{query}%"
            q = q.filter(
                or_(
                    CreatorProfile.display_name.ilike(search_pattern),
                    CreatorProfile.category.ilike(search_pattern),
                    CreatorProfile.bio.ilike(search_pattern)
                )
            )
        return q.order_by(CreatorProfile.created_at.desc()).all()

    @staticmethod
    def check_creator_availability(
        db: Session,
        creator_id: int,
        date_start: Optional[DateType] = None,
        date_end: Optional[DateType] = None
    ) -> dict:
        from app.models.collaboration import Collaboration
        creator = db.query(CreatorProfile).filter(CreatorProfile.id == creator_id).first()
        if not creator:
            creator = db.query(CreatorProfile).filter(CreatorProfile.user_id == creator_id).first()
        if not creator:
            raise HTTPException(status_code=404, detail="Creator not found")

        if not date_start:
            return {"available": True, "creator_id": creator.id, "conflicts": 0, "suggested_dates": []}

        end_date = date_end or date_start
        conflicts = db.query(Collaboration).filter(
            Collaboration.creator_id == creator.id,
            Collaboration.status.in_(["requested", "accepted", "payment_pending", "paid", "active"]),
            Collaboration.requested_date >= date_start,
            Collaboration.requested_date <= end_date
        ).all()

        if conflicts:
            from datetime import timedelta
            suggested = [
                (end_date + timedelta(days=i)).isoformat()
                for i in range(1, 4)
            ]
            return {
                "available": False,
                "creator_id": creator.id,
                "conflicts": len(conflicts),
                "suggested_dates": suggested
            }

        return {
            "available": True,
            "creator_id": creator.id,
            "conflicts": 0,
            "suggested_dates": []
        }

    @staticmethod
    def search_creators(
        db: Session,
        query: Optional[str] = None,
        date_start: Optional[DateType] = None,
        date_end: Optional[DateType] = None
    ) -> List[dict]:
        from app.models.collaboration import Collaboration
        creators = db.query(CreatorProfile).filter(CreatorProfile.verification_status == "approved").all()

        unavailable_ids = set()
        if date_start and date_end:
            busy = db.query(Collaboration.creator_id).filter(
                Collaboration.status.in_(["requested", "accepted", "payment_pending", "paid", "active"]),
                Collaboration.requested_date >= date_start,
                Collaboration.requested_date <= date_end,
            ).all()
            unavailable_ids = {row[0] for row in busy if row[0] is not None}

        def is_available(c: CreatorProfile) -> bool:
            if date_start and date_end and c.id in unavailable_ids:
                return False
            return True

        def creator_payload(c: CreatorProfile, match_score: float = 1.0) -> dict:
            return {
                "id": c.id,
                "user_id": c.user_id,
                "display_name": c.display_name,
                "name": c.name or c.display_name,
                "bio": c.bio,
                "category": c.category or "General",
                "experience_years": c.experience_years or 0,
                "languages": c.languages or [],
                "instagram_url": c.instagram_url,
                "facebook_url": c.facebook_url,
                "youtube_url": c.youtube_url,
                "portfolio_url": c.portfolio_url,
                "verification_status": c.verification_status,
                "is_verified": c.is_verified,
                "match_score": match_score,
                "available": is_available(c),
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }

        if query:
            from app.ai.recommender import recommender_agent
            results = recommender_agent.get_recommendations(query, creators, item_type="creator")
            output = []
            for r in results:
                c = r["item"]
                output.append(creator_payload(c, match_score=r["matchScore"]))
            return output

        return [creator_payload(c) for c in creators]

    @staticmethod
    def get_wishlist(db: Session, user_id: int) -> List[Wishlist]:
        return db.query(Wishlist).filter(Wishlist.user_id == user_id).all()

    @staticmethod
    def add_to_wishlist(db: Session, user_id: int, target_type: str, target_id: int) -> Wishlist:
        existing = db.query(Wishlist).filter(
            Wishlist.user_id == user_id,
            Wishlist.target_type == target_type,
            Wishlist.target_id == target_id
        ).first()
        if existing:
            return existing
        
        w = Wishlist(user_id=user_id, target_type=target_type, target_id=target_id)
        db.add(w)
        db.commit()
        db.refresh(w)
        return w

    @staticmethod
    def remove_from_wishlist(db: Session, user_id: int, target_type: str, target_id: int):
        db.query(Wishlist).filter(
            Wishlist.user_id == user_id,
            Wishlist.target_type == target_type,
            Wishlist.target_id == target_id
        ).delete()
        db.commit()
        return {"success": True}

    @staticmethod
    def get_messages(db: Session, user_id: int) -> list:
        messages = (
            db.query(Message)
            .filter((Message.sender_id == user_id) | (Message.receiver_id == user_id))
            .order_by(Message.created_at.asc())
            .all()
        )

        conversations = defaultdict(list)
        partner_ids = set()
        for m in messages:
            partner_id = m.receiver_id if m.sender_id == user_id else m.sender_id
            partner_ids.add(partner_id)
            conversations[partner_id].append({
                "id": m.id,
                "from": "me" if m.sender_id == user_id else "them",
                "text": m.message,
                "time": m.created_at.strftime("%H:%M") if m.created_at else "",
                "is_read": m.is_read,
                "collaboration_id": m.collaboration_id,
                "booking_id": m.booking_id,
            })

        partners = db.query(Login).filter(Login.id.in_(partner_ids)).all()
        partner_map = {p.id: p for p in partners}

        result = []
        for pid, msgs in conversations.items():
            partner = partner_map.get(pid)
            last_msg = msgs[-1] if msgs else {}
            unread = sum(1 for m in msgs if m["from"] == "them" and not m["is_read"])
            
            role = "Tourist"
            if partner:
                if partner.farmer_profile and partner.farmer_profile.verification_status == "approved":
                    role = "Farmer"
                elif partner.creator_profile and partner.creator_profile.verification_status == "approved":
                    role = "Creator"

            result.append({
                "id": f"conv-{pid}",
                "partner_id": pid,
                "name": partner.name if partner else f"User {pid}",
                "role": role,
                "last": last_msg.get("text", ""),
                "time": last_msg.get("time", ""),
                "unread": unread,
                "messages": msgs,
            })

        return result

    @staticmethod
    def send_message(db: Session, sender_id: int, data: MessageCreate) -> Message:
        receiver = db.query(Login).filter(Login.id == data.receiver_id).first()
        if not receiver:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receiver not found")

        msg = Message(
            sender_id=sender_id,
            receiver_id=data.receiver_id,
            message=data.message,
            collaboration_id=data.collaboration_id,
            booking_id=data.booking_id
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg

    @staticmethod
    def get_notifications(db: Session, user_id: int) -> list:
        notifications = (
            db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .all()
        )
        return notifications

    @staticmethod
    def mark_notification_read(db: Session, user_id: int, notification_id: int):
        n = db.query(Notification).filter(Notification.id == notification_id).first()
        if not n:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        if n.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorised")
        n.is_read = True
        db.commit()
        return {"success": True}

    @staticmethod
    def mark_all_notifications_read(db: Session, user_id: int):
        db.query(Notification).filter(
            Notification.user_id == user_id, Notification.is_read == False
        ).update({"is_read": True})
        db.commit()
        return {"success": True}

    @staticmethod
    def submit_contact(db: Session, data: ContactCreate) -> ContactMessage:
        c = ContactMessage(
            name=data.name,
            email=data.email,
            mobile=data.mobile,
            subject=data.subject,
            message=data.message
        )
        db.add(c)
        db.commit()
        db.refresh(c)
        return c

    @staticmethod
    def register_farmer(db: Session, data, user_id: int) -> FarmerProfile:
        f = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
        if f:
            return f
        
        profile_data = {}
        if hasattr(data, "profile") and data.profile:
            profile_data = data.profile
            if not isinstance(profile_data, dict):
                profile_data = profile_data.model_dump() if hasattr(profile_data, "model_dump") else {}
        elif isinstance(data, dict) and "profile" in data:
            profile_data = data["profile"]
        elif isinstance(data, dict):
            profile_data = data

        aadhaar_no = profile_data.get("aadhaar_no", "")
        if aadhaar_no and len(str(aadhaar_no)) != 12:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Aadhaar must be exactly 12 digits")

        f = FarmerProfile(
            user_id=user_id,
            verification_status="approved"
        )
        db.add(f)
        db.commit()
        db.refresh(f)
        return f

    @staticmethod
    def register_creator(db: Session, data, user_id: int) -> CreatorProfile:
        c = db.query(CreatorProfile).filter(CreatorProfile.user_id == user_id).first()
        if c:
            return c

        profile_data = {}
        if hasattr(data, "profile") and data.profile:
            profile_data = data.profile
            if not isinstance(profile_data, dict):
                profile_data = profile_data.model_dump() if hasattr(profile_data, "model_dump") else {}
        elif isinstance(data, dict) and "profile" in data:
            profile_data = data["profile"]
        elif isinstance(data, dict):
            profile_data = data

        c = CreatorProfile(
            user_id=user_id,
            display_name=profile_data.get("name", "Creator"),
            verification_status="approved"
        )
        db.add(c)
        db.commit()
        db.refresh(c)
        return c

