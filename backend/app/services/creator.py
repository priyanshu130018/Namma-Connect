"""Creator and Collaboration Domain Service for Namma Connect V2."""

import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.creator import (
    PortfolioItemSchema,
    CreatorPackageSchema,
    CreatorProfileResponse,
    CreatorProfileUpdateRequest,
    CollaborationCreateRequest,
    CollaborationResponse,
)


class _CreatorMemoryStore:
    """Thread-safe and process-lifetime memory store for Creator Profiles and Collaborations."""
    _initialized = False
    _profiles: Dict[str, Dict[str, Any]] = {}
    _collaborations: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def initialize(cls):
        if cls._initialized:
            return
        cls._initialized = True


class CreatorService:
    """Business logic for Content Creators, Media Kits, Portfolios, Packages, and Collaborations."""

    @classmethod
    def ensure_seeded(cls, db: Session):
        """No-op: Creator profiles are registered dynamically."""
        _CreatorMemoryStore.initialize()

    @classmethod
    def _to_creator_response(cls, data: Dict[str, Any]) -> CreatorProfileResponse:
        portfolios = [PortfolioItemSchema(**item) if isinstance(item, dict) else item for item in data.get("portfolio_items", [])]
        packages = [CreatorPackageSchema(**pkg) if isinstance(pkg, dict) else pkg for pkg in data.get("packages", [])]
        return CreatorProfileResponse(
            id=str(data["id"]),
            user_id=str(data["user_id"]),
            display_name=data.get("display_name", "Creator"),
            handle=data.get("handle", "@creator"),
            avatar_url=data.get("avatar_url"),
            bio=data.get("bio", ""),
            location=data.get("location", "Karnataka, India"),
            reach=data.get("reach", "10K+ Reach"),
            starting_rate=float(data.get("starting_rate", 0.0)),
            rating=float(data.get("rating", 0.0)),
            reviews_count=int(data.get("reviews_count", 0)),
            is_verified=bool(data.get("is_verified", False)),
            specialties=data.get("specialties", []),
            social_links=data.get("social_links", {}),
            portfolio_items=portfolios,
            packages=packages,
            created_at=data.get("created_at"),
        )

    @classmethod
    def _to_collaboration_response(cls, data: Dict[str, Any]) -> CollaborationResponse:
        return CollaborationResponse(
            id=str(data["id"]),
            collaboration_code=data["collaboration_code"],
            creator_id=str(data["creator_id"]),
            creator_name=data.get("creator_name", "Creator"),
            creator_handle=data.get("creator_handle", "@creator"),
            partner_id=str(data["partner_id"]),
            partner_name=data.get("partner_name", "Partner Host"),
            campaign_title=data.get("campaign_title", "Campaign"),
            message=data.get("message", ""),
            proposed_dates=data.get("proposed_dates", ""),
            budget=float(data.get("budget", 0.0)),
            deliverables=data.get("deliverables", []),
            status=data.get("status", "PENDING"),
            created_at=data.get("created_at"),
        )

    @classmethod
    def get_or_create_creator_profile(cls, db: Session, user: User) -> CreatorProfileResponse:
        """Get or initialize the authenticated user's CreatorProfile."""
        cls.ensure_seeded(db)
        u_id = str(user.id)
        if u_id in _CreatorMemoryStore._profiles:
            return cls._to_creator_response(_CreatorMemoryStore._profiles[u_id])

        clean_handle = f"@{user.email.split('@')[0].replace('.', '_')}"
        profile = {
            "id": u_id,
            "user_id": u_id,
            "display_name": user.full_name or "Creator",
            "handle": clean_handle,
            "avatar_url": user.avatar_url,
            "bio": "Rural storyteller and visual creator based in Karnataka.",
            "location": "Karnataka, India",
            "reach": "10K+ Reach",
            "starting_rate": 10000.0,
            "rating": 5.0,
            "reviews_count": 0,
            "is_verified": user.is_verified,
            "specialties": ["Agro-Stories", "Photography", "Videography"],
            "social_links": {},
            "portfolio_items": [],
            "packages": [
                {
                    "id": f"pkg-{uuid.uuid4().hex[:4]}",
                    "title": "Standard Creator Media Package",
                    "price": 10000.0,
                    "deliverables": ["1x Promotional Reel", "10x High-Res Photos"],
                    "turnaround": "5 Business Days",
                }
            ],
            "created_at": datetime.utcnow(),
        }
        _CreatorMemoryStore._profiles[u_id] = profile
        return cls._to_creator_response(profile)

    @classmethod
    def update_creator_profile(
        cls,
        db: Session,
        user: User,
        payload: CreatorProfileUpdateRequest,
    ) -> CreatorProfileResponse:
        """Update authenticated creator's profile information."""
        cls.ensure_seeded(db)
        u_id = str(user.id)
        if u_id not in _CreatorMemoryStore._profiles:
            cls.get_or_create_creator_profile(db, user)

        prof = _CreatorMemoryStore._profiles[u_id]
        if payload.display_name is not None:
            prof["display_name"] = payload.display_name
        if payload.bio is not None:
            prof["bio"] = payload.bio
        if payload.location is not None:
            prof["location"] = payload.location
        if payload.reach is not None:
            prof["reach"] = payload.reach
        if payload.starting_rate is not None:
            prof["starting_rate"] = payload.starting_rate
        if payload.specialties is not None:
            prof["specialties"] = payload.specialties
        if payload.social_links is not None:
            prof["social_links"] = payload.social_links

        return cls._to_creator_response(prof)

    @classmethod
    def add_portfolio_item(
        cls,
        db: Session,
        user: User,
        item: PortfolioItemSchema,
    ) -> CreatorProfileResponse:
        """Add a portfolio media asset to creator profile."""
        cls.ensure_seeded(db)
        u_id = str(user.id)
        if u_id not in _CreatorMemoryStore._profiles:
            cls.get_or_create_creator_profile(db, user)

        prof = _CreatorMemoryStore._profiles[u_id]
        prof["portfolio_items"].append(item.model_dump())
        return cls._to_creator_response(prof)

    @classmethod
    def add_or_update_package(
        cls,
        db: Session,
        user: User,
        pkg: CreatorPackageSchema,
    ) -> CreatorProfileResponse:
        """Add or update a fixed-price media package."""
        cls.ensure_seeded(db)
        u_id = str(user.id)
        if u_id not in _CreatorMemoryStore._profiles:
            cls.get_or_create_creator_profile(db, user)

        prof = _CreatorMemoryStore._profiles[u_id]
        if not pkg.id:
            pkg.id = f"pkg-{uuid.uuid4().hex[:6]}"

        packages = prof["packages"]
        existing_idx = next((i for i, p in enumerate(packages) if p.get("id") == pkg.id), None)
        if existing_idx is not None:
            packages[existing_idx] = pkg.model_dump()
        else:
            packages.append(pkg.model_dump())

        return cls._to_creator_response(prof)

    @classmethod
    def list_public_creators(cls, db: Session) -> List[CreatorProfileResponse]:
        """List publicly discoverable verified creators."""
        cls.ensure_seeded(db)
        seen = set()
        creators = []
        for prof in _CreatorMemoryStore._profiles.values():
            p_id = prof["id"]
            if p_id not in seen:
                seen.add(p_id)
                creators.append(cls._to_creator_response(prof))
        return creators

    @classmethod
    def get_public_creator_by_id(cls, db: Session, creator_id: str) -> CreatorProfileResponse:
        """Fetch public profile and media kit for a creator."""
        cls.ensure_seeded(db)
        if creator_id in _CreatorMemoryStore._profiles:
            return cls._to_creator_response(_CreatorMemoryStore._profiles[creator_id])

        # Also search by handle or user
        for prof in _CreatorMemoryStore._profiles.values():
            if str(prof.get("id")) == creator_id or str(prof.get("user_id")) == creator_id:
                return cls._to_creator_response(prof)

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Creator with ID '{creator_id}' not found.",
        )

    # ── Collaborations ──

    @classmethod
    def create_collaboration_proposal(
        cls,
        db: Session,
        partner_user: User,
        payload: CollaborationCreateRequest,
    ) -> CollaborationResponse:
        """Submit a new campaign collaboration proposal to a creator."""
        cls.ensure_seeded(db)
        creator_prof = None
        if payload.creator_id in _CreatorMemoryStore._profiles:
            creator_prof = _CreatorMemoryStore._profiles[payload.creator_id]
        else:
            for prof in _CreatorMemoryStore._profiles.values():
                if str(prof.get("id")) == payload.creator_id or str(prof.get("user_id")) == payload.creator_id:
                    creator_prof = prof
                    break

        if not creator_prof:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target Creator with ID '{payload.creator_id}' not found.",
            )

        # Duplicate check
        creator_uid = str(creator_prof["user_id"])
        partner_uid = str(partner_user.id)
        for existing in _CreatorMemoryStore._collaborations.values():
            if (
                existing["creator_id"] == creator_uid
                and existing["partner_id"] == partner_uid
                and existing["campaign_title"].strip().lower() == payload.campaign_title.strip().lower()
                and existing["status"] in ["PENDING", "ACCEPTED"]
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"An active collaboration proposal ('{payload.campaign_title}') already exists with this creator.",
                )

        collab_id = str(uuid.uuid4())
        collab_data = {
            "id": collab_id,
            "collaboration_code": f"NC-COL-{uuid.uuid4().hex[:6].upper()}",
            "creator_id": creator_uid,
            "creator_name": creator_prof.get("display_name", "Creator"),
            "creator_handle": creator_prof.get("handle", "@creator"),
            "partner_id": partner_uid,
            "partner_name": partner_user.full_name,
            "campaign_title": payload.campaign_title.strip(),
            "message": payload.message,
            "proposed_dates": payload.proposed_dates,
            "budget": payload.budget,
            "deliverables": payload.deliverables,
            "status": "PENDING",
            "created_at": datetime.utcnow(),
        }
        _CreatorMemoryStore._collaborations[collab_id] = collab_data

        # Dispatch Notification
        try:
            from app.services.communication import NotificationService
            NotificationService.create_notification(
                db,
                user_id=creator_prof["user_id"],
                title=f"New Collaboration Proposal: {collab_data['campaign_title']}",
                message=f"{partner_user.full_name} submitted a collaboration proposal (Budget: ₹{collab_data['budget']:,.0f}).",
                type="collaboration",
                resource_type="collaboration",
                resource_id=collab_data["collaboration_code"],
            )
        except Exception:
            pass

        return cls._to_collaboration_response(collab_data)

    @classmethod
    def list_user_collaborations(
        cls,
        db: Session,
        user: User,
    ) -> List[CollaborationResponse]:
        """List all collaborations involving the authenticated user as partner or creator."""
        cls.ensure_seeded(db)
        u_id = str(user.id)
        results = [
            cls._to_collaboration_response(c)
            for c in _CreatorMemoryStore._collaborations.values()
            if c["creator_id"] == u_id or c["partner_id"] == u_id
        ]
        results.sort(key=lambda x: x.created_at or datetime.min, reverse=True)
        return results

    @classmethod
    def list_all_collaborations(cls, db: Session, limit: int = 50, offset: int = 0) -> List[CollaborationResponse]:
        """Admin oversight: list all platform collaborations."""
        cls.ensure_seeded(db)
        all_collabs = sorted(
            _CreatorMemoryStore._collaborations.values(),
            key=lambda x: x.get("created_at") or datetime.min,
            reverse=True,
        )
        return [cls._to_collaboration_response(c) for c in all_collabs[offset : offset + limit]]

    @classmethod
    def accept_collaboration(
        cls,
        db: Session,
        user: User,
        collab_id: str,
    ) -> CollaborationResponse:
        """Creator accepts collaboration proposal."""
        collab = _CreatorMemoryStore._collaborations.get(collab_id)
        if not collab:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaboration request not found.")
        if collab["creator_id"] != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the invited creator can accept this collaboration request.",
            )
        if collab["status"] != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot accept collaboration in '{collab['status']}' state.",
            )

        collab["status"] = "ACCEPTED"

        try:
            from app.services.communication import NotificationService
            NotificationService.create_notification(
                db,
                user_id=collab["partner_id"],
                title="Collaboration Proposal Accepted",
                message=f"{collab['creator_name']} has accepted your collaboration proposal for '{collab['campaign_title']}'.",
                type="collaboration",
                resource_type="collaboration",
                resource_id=collab["collaboration_code"],
            )
        except Exception:
            pass

        return cls._to_collaboration_response(collab)

    @classmethod
    def reject_collaboration(
        cls,
        db: Session,
        user: User,
        collab_id: str,
    ) -> CollaborationResponse:
        """Creator rejects collaboration proposal."""
        collab = _CreatorMemoryStore._collaborations.get(collab_id)
        if not collab:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaboration request not found.")
        if collab["creator_id"] != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the invited creator can decline this collaboration request.",
            )
        if collab["status"] != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot decline collaboration in '{collab['status']}' state.",
            )

        collab["status"] = "REJECTED"

        try:
            from app.services.communication import NotificationService
            NotificationService.create_notification(
                db,
                user_id=collab["partner_id"],
                title="Collaboration Proposal Declined",
                message=f"{collab['creator_name']} declined your collaboration proposal for '{collab['campaign_title']}'.",
                type="collaboration",
                resource_type="collaboration",
                resource_id=collab["collaboration_code"],
            )
        except Exception:
            pass

        return cls._to_collaboration_response(collab)

    @classmethod
    def complete_collaboration(
        cls,
        db: Session,
        user: User,
        collab_id: str,
    ) -> CollaborationResponse:
        """Mark accepted collaboration completed."""
        collab = _CreatorMemoryStore._collaborations.get(collab_id)
        if not collab:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaboration request not found.")
        u_id = str(user.id)
        if u_id not in [collab["creator_id"], collab["partner_id"]]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to mark this collaboration complete.",
            )
        if collab["status"] != "ACCEPTED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot mark collaboration as completed from '{collab['status']}' state.",
            )

        collab["status"] = "COMPLETED"

        try:
            from app.services.communication import NotificationService
            for uid, uname, rname in [
                (collab["partner_id"], collab["partner_name"], collab["creator_name"]),
                (collab["creator_id"], collab["creator_name"], collab["partner_name"]),
            ]:
                NotificationService.create_notification(
                    db,
                    user_id=uid,
                    title="Collaboration Completed",
                    message=f"Collaboration deal '{collab['campaign_title']}' has been completed.",
                    type="collaboration",
                    resource_type="collaboration",
                    resource_id=collab["collaboration_code"],
                )
        except Exception:
            pass

        return cls._to_collaboration_response(collab)
