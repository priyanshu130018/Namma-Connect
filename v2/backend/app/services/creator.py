"""Creator and Collaboration Domain Service."""

import json
import uuid
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.creator import CreatorProfile
from app.models.collaboration import Collaboration
from app.schemas.creator import (
    PortfolioItemSchema,
    CreatorPackageSchema,
    CreatorProfileResponse,
    CreatorProfileUpdateRequest,
    CollaborationCreateRequest,
    CollaborationResponse,
)


class CreatorService:
    """Business logic for Creator Media Kits, Portfolios, Packages, and Collaborations."""

    @classmethod
    def _to_creator_response(cls, p: CreatorProfile) -> CreatorProfileResponse:
        try:
            specialties = json.loads(p.specialties_json or "[]")
        except Exception:
            specialties = []
        try:
            social_links = json.loads(p.social_links_json or "{}")
        except Exception:
            social_links = {}
        try:
            raw_portfolio = json.loads(p.portfolio_items_json or "[]")
            portfolio = [PortfolioItemSchema(**item) for item in raw_portfolio]
        except Exception:
            portfolio = []
        try:
            raw_packages = json.loads(p.packages_json or "[]")
            packages = [CreatorPackageSchema(**pkg) for pkg in raw_packages]
        except Exception:
            packages = []

        return CreatorProfileResponse(
            id=str(p.id),
            user_id=str(p.user_id),
            display_name=p.display_name,
            handle=p.handle,
            avatar_url=p.avatar_url,
            bio=p.bio,
            location=p.location,
            reach=p.reach,
            starting_rate=p.starting_rate,
            rating=p.rating,
            reviews_count=p.reviews_count,
            is_verified=p.is_verified,
            specialties=specialties,
            social_links=social_links,
            portfolio_items=portfolio,
            packages=packages,
            created_at=p.created_at,
        )

    @classmethod
    def _to_collaboration_response(cls, c: Collaboration) -> CollaborationResponse:
        try:
            deliverables = json.loads(c.deliverables_json or "[]")
        except Exception:
            deliverables = []

        return CollaborationResponse(
            id=str(c.id),
            collaboration_code=c.collaboration_code,
            creator_id=str(c.creator_id),
            creator_name=c.creator_name,
            creator_handle=c.creator_handle,
            partner_id=str(c.partner_id),
            partner_name=c.partner_name,
            campaign_title=c.campaign_title,
            message=c.message,
            proposed_dates=c.proposed_dates,
            budget=c.budget,
            deliverables=deliverables,
            status=c.status,
            created_at=c.created_at,
        )

    @classmethod
    def ensure_seeded(cls, db: Session):
        """Seed featured creators if table is empty."""
        count = db.query(CreatorProfile).count()
        if count > 0:
            return

        seed_data = [
            {
                "display_name": "Priya Sharma",
                "handle": "@priyasharma",
                "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
                "bio": "Agro-cinematographer & visual storyteller documenting Western Ghats organic estates and farm recipes.",
                "location": "Bangalore & Coorg, Karnataka",
                "reach": "120K+ Followers",
                "starting_rate": 15000.0,
                "rating": 4.96,
                "reviews_count": 28,
                "is_verified": True,
                "specialties_json": json.dumps(["Drone Cinematography", "Farm-to-Table Stories", "Reel Kits"]),
                "social_links_json": json.dumps({"instagram": "@priyasharma", "youtube": "PriyaMalnadStories"}),
                "portfolio_items_json": json.dumps([
                    {
                        "title": "Coorg Mist Blossom Drone Reel",
                        "location": "Madikeri, Karnataka",
                        "imageUrl": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80",
                        "category": "Drone Video",
                    },
                    {
                        "title": "Wayanad Tribal Honey Harvesters",
                        "location": "Kalpetta, Kerala",
                        "imageUrl": "https://images.unsplash.com/photo-1592417817098-8f3d6eb2252a?w=600&auto=format&fit=crop&q=80",
                        "category": "Documentary",
                    },
                ]),
                "packages_json": json.dumps([
                    {
                        "id": "pkg-1",
                        "title": "Estate Harvest 4K Cinematography Package",
                        "price": 15000.0,
                        "deliverables": ["2x 4K Drone Reels (60s)", "15x Retouched High-Res Photos", "Audio & Drone Color Grading"],
                        "turnaround": "5 Business Days",
                    },
                    {
                        "id": "pkg-2",
                        "title": "Farm-to-Table Culinary & Recipe Feature",
                        "price": 20000.0,
                        "deliverables": ["1x Long-Form YouTube Feature (8-10m)", "3x Story Snippets", "Full Commercial Usage Rights"],
                        "turnaround": "7 Business Days",
                    },
                ]),
            },
            {
                "display_name": "Kiran Aerials",
                "handle": "@kiranaerials",
                "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
                "bio": "Certified FPV drone pilot specializing in high-action off-road safaris and estate landscapes.",
                "location": "Chikmagalur, Karnataka",
                "reach": "85K+ Followers",
                "starting_rate": 12000.0,
                "rating": 4.92,
                "reviews_count": 19,
                "is_verified": True,
                "specialties_json": json.dumps(["FPV Drone", "Off-road Trails", "Estate Overviews"]),
                "social_links_json": json.dumps({"instagram": "@kiranaerials"}),
                "portfolio_items_json": json.dumps([
                    {
                        "title": "Chikmagalur Coffee Pod Processing",
                        "location": "Chikmagalur, Karnataka",
                        "imageUrl": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80",
                        "category": "Landscape",
                    }
                ]),
                "packages_json": json.dumps([
                    {
                        "id": "pkg-3",
                        "title": "FPV Trail & Safari Promo Package",
                        "price": 12000.0,
                        "deliverables": ["1x FPV Flythrough (90s)", "10x High-Res Action Stills"],
                        "turnaround": "3 Business Days",
                    }
                ]),
            },
        ]

        for s in seed_data:
            # Create a placeholder user or standalone profile
            profile = CreatorProfile(
                user_id=uuid.uuid4(),
                display_name=s["display_name"],
                handle=s["handle"],
                avatar_url=s["avatar_url"],
                bio=s["bio"],
                location=s["location"],
                reach=s["reach"],
                starting_rate=s["starting_rate"],
                rating=s["rating"],
                reviews_count=s["reviews_count"],
                is_verified=s["is_verified"],
                specialties_json=s["specialties_json"],
                social_links_json=s["social_links_json"],
                portfolio_items_json=s["portfolio_items_json"],
                packages_json=s["packages_json"],
            )
            db.add(profile)
        db.commit()

    @classmethod
    def get_or_create_creator_profile(cls, db: Session, user: User) -> CreatorProfileResponse:
        """Get or initialize the authenticated user's CreatorProfile."""
        cls.ensure_seeded(db)
        profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()
        if not profile:
            clean_handle = f"@{user.email.split('@')[0].replace('.', '_')}"
            profile = CreatorProfile(
                user_id=user.id,
                display_name=user.full_name,
                handle=clean_handle,
                avatar_url=user.avatar_url,
                bio=f"Rural storyteller and visual creator based in Karnataka.",
                location="Karnataka, India",
                reach="10K+ Reach",
                starting_rate=10000.0,
                rating=5.0,
                reviews_count=0,
                is_verified=user.is_verified,
                specialties_json=json.dumps(["Agro-Stories", "Photography"]),
                social_links_json=json.dumps({}),
                portfolio_items_json=json.dumps([]),
                packages_json=json.dumps([
                    {
                        "id": f"pkg-{uuid.uuid4().hex[:4]}",
                        "title": "Standard Creator Media Package",
                        "price": 10000.0,
                        "deliverables": ["1x Promotional Reel", "10x High-Res Photos"],
                        "turnaround": "5 Business Days",
                    }
                ]),
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)

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
        profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()
        if not profile:
            cls.get_or_create_creator_profile(db, user)
            profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()

        if payload.display_name is not None:
            profile.display_name = payload.display_name
        if payload.bio is not None:
            profile.bio = payload.bio
        if payload.location is not None:
            profile.location = payload.location
        if payload.reach is not None:
            profile.reach = payload.reach
        if payload.starting_rate is not None:
            profile.starting_rate = payload.starting_rate
        if payload.specialties is not None:
            profile.specialties_json = json.dumps(payload.specialties)
        if payload.social_links is not None:
            profile.social_links_json = json.dumps(payload.social_links)

        db.commit()
        db.refresh(profile)
        return cls._to_creator_response(profile)

    @classmethod
    def add_portfolio_item(
        cls,
        db: Session,
        user: User,
        item: PortfolioItemSchema,
    ) -> CreatorProfileResponse:
        """Add a portfolio media asset to creator profile."""
        profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()
        if not profile:
            cls.get_or_create_creator_profile(db, user)
            profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()

        try:
            items = json.loads(profile.portfolio_items_json or "[]")
        except Exception:
            items = []

        items.append(item.model_dump())
        profile.portfolio_items_json = json.dumps(items)
        db.commit()
        db.refresh(profile)
        return cls._to_creator_response(profile)

    @classmethod
    def add_or_update_package(
        cls,
        db: Session,
        user: User,
        pkg: CreatorPackageSchema,
    ) -> CreatorProfileResponse:
        """Add or update a fixed-price media package."""
        profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()
        if not profile:
            cls.get_or_create_creator_profile(db, user)
            profile = db.query(CreatorProfile).filter(CreatorProfile.user_id == user.id).first()

        try:
            packages = json.loads(profile.packages_json or "[]")
        except Exception:
            packages = []

        if not pkg.id:
            pkg.id = f"pkg-{uuid.uuid4().hex[:6]}"

        # Check existing
        existing_idx = next((i for i, p in enumerate(packages) if p.get("id") == pkg.id), None)
        if existing_idx is not None:
            packages[existing_idx] = pkg.model_dump()
        else:
            packages.append(pkg.model_dump())

        profile.packages_json = json.dumps(packages)
        db.commit()
        db.refresh(profile)
        return cls._to_creator_response(profile)

    @classmethod
    def list_public_creators(cls, db: Session) -> List[CreatorProfileResponse]:
        """List publicly discoverable verified creators."""
        cls.ensure_seeded(db)
        creators = db.query(CreatorProfile).filter(CreatorProfile.is_verified == True).all()
        return [cls._to_creator_response(c) for c in creators]

    @classmethod
    def get_public_creator_by_id(cls, db: Session, creator_id: str) -> CreatorProfileResponse:
        """Fetch public profile and media kit for a creator."""
        cls.ensure_seeded(db)
        profile = db.query(CreatorProfile).filter(
            (CreatorProfile.id == creator_id) | (CreatorProfile.user_id == creator_id)
        ).first()
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Creator with ID '{creator_id}' not found.",
            )
        return cls._to_creator_response(profile)

    # ── Collaborations ──

    @classmethod
    def create_collaboration_proposal(
        cls,
        db: Session,
        partner_user: User,
        payload: CollaborationCreateRequest,
    ) -> CollaborationResponse:
        """Submit a new campaign collaboration proposal to a creator with duplicate prevention & notification."""
        cls.ensure_seeded(db)
        # Find creator
        creator = db.query(CreatorProfile).filter(
            (CreatorProfile.id == payload.creator_id) | (CreatorProfile.user_id == payload.creator_id)
        ).first()
        if not creator:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target Creator with ID '{payload.creator_id}' not found.",
            )

        # Duplicate active collaboration protection
        active_collab = (
            db.query(Collaboration)
            .filter(
                Collaboration.creator_id == creator.user_id,
                Collaboration.partner_id == partner_user.id,
                Collaboration.campaign_title == payload.campaign_title.strip(),
                Collaboration.status.in_(["PENDING", "ACCEPTED"]),
            )
            .first()
        )
        if active_collab:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An active collaboration proposal ('{payload.campaign_title}') already exists with this creator.",
            )

        collab = Collaboration(
            collaboration_code=f"NC-COL-{uuid.uuid4().hex[:6].upper()}",
            creator_id=creator.user_id,
            creator_name=creator.display_name,
            creator_handle=creator.handle,
            partner_id=partner_user.id,
            partner_name=partner_user.full_name,
            campaign_title=payload.campaign_title.strip(),
            message=payload.message,
            proposed_dates=payload.proposed_dates,
            budget=payload.budget,
            deliverables_json=json.dumps(payload.deliverables),
            status="PENDING",
        )
        db.add(collab)
        db.commit()
        db.refresh(collab)

        # Dispatch Notification and Transactional Email to Creator
        try:
            from app.services.communication import NotificationService
            from app.services.email import EmailService

            NotificationService.create_notification(
                db,
                user_id=creator.user_id,
                title=f"New Collaboration Proposal: {collab.campaign_title}",
                message=f"{partner_user.full_name} submitted a collaboration proposal (Budget: ₹{collab.budget:,.0f}).",
                type="collaboration",
                resource_type="collaboration",
                resource_id=collab.collaboration_code,
            )
            creator_user = db.query(User).filter(User.id == creator.user_id).first()
            if creator_user and creator_user.email:
                EmailService.send_collaboration_email(
                    to_email=creator_user.email,
                    recipient_name=creator.display_name,
                    proposal_title=collab.campaign_title,
                    sender_name=partner_user.full_name,
                    status_text="received",
                )
        except Exception:
            pass

        return cls._to_collaboration_response(collab)

    @classmethod
    def list_user_collaborations(
        cls,
        db: Session,
        user: User,
    ) -> List[CollaborationResponse]:
        """List all collaborations involving the authenticated user as partner or creator."""
        cls.ensure_seeded(db)
        collabs = (
            db.query(Collaboration)
            .filter((Collaboration.creator_id == user.id) | (Collaboration.partner_id == user.id))
            .order_by(Collaboration.created_at.desc())
            .all()
        )
        return [cls._to_collaboration_response(c) for c in collabs]

    @classmethod
    def accept_collaboration(
        cls,
        db: Session,
        user: User,
        collab_id: str,
    ) -> CollaborationResponse:
        """Creator accepts collaboration proposal."""
        collab = db.query(Collaboration).filter(Collaboration.id == collab_id).first()
        if not collab:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaboration request not found.")
        if collab.creator_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the invited creator can accept this collaboration request.",
            )
        if collab.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot accept collaboration in '{collab.status}' state.",
            )

        collab.status = "ACCEPTED"
        db.commit()
        db.refresh(collab)

        # Notify Requester / Partner
        try:
            from app.services.communication import NotificationService
            from app.services.email import EmailService

            NotificationService.create_notification(
                db,
                user_id=collab.partner_id,
                title="Collaboration Proposal Accepted",
                message=f"{collab.creator_name} has accepted your collaboration proposal for '{collab.campaign_title}'.",
                type="collaboration",
                resource_type="collaboration",
                resource_id=collab.collaboration_code,
            )
            partner_user = db.query(User).filter(User.id == collab.partner_id).first()
            if partner_user and partner_user.email:
                EmailService.send_collaboration_email(
                    to_email=partner_user.email,
                    recipient_name=collab.partner_name,
                    proposal_title=collab.campaign_title,
                    sender_name=collab.creator_name,
                    status_text="accepted",
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
        collab = db.query(Collaboration).filter(Collaboration.id == collab_id).first()
        if not collab:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaboration request not found.")
        if collab.creator_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the invited creator can decline this collaboration request.",
            )
        if collab.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot decline collaboration in '{collab.status}' state.",
            )

        collab.status = "REJECTED"
        db.commit()
        db.refresh(collab)

        # Notify Requester / Partner
        try:
            from app.services.communication import NotificationService
            from app.services.email import EmailService

            NotificationService.create_notification(
                db,
                user_id=collab.partner_id,
                title="Collaboration Proposal Declined",
                message=f"{collab.creator_name} declined your collaboration proposal for '{collab.campaign_title}'.",
                type="collaboration",
                resource_type="collaboration",
                resource_id=collab.collaboration_code,
            )
            partner_user = db.query(User).filter(User.id == collab.partner_id).first()
            if partner_user and partner_user.email:
                EmailService.send_collaboration_email(
                    to_email=partner_user.email,
                    recipient_name=collab.partner_name,
                    proposal_title=collab.campaign_title,
                    sender_name=collab.creator_name,
                    status_text="declined",
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
        collab = db.query(Collaboration).filter(Collaboration.id == collab_id).first()
        if not collab:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaboration request not found.")
        if user.id not in [collab.creator_id, collab.partner_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to mark this collaboration complete.",
            )
        if collab.status != "ACCEPTED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot mark collaboration as completed from '{collab.status}' state.",
            )

        collab.status = "COMPLETED"
        db.commit()
        db.refresh(collab)

        # Notify Both Parties
        try:
            from app.services.communication import NotificationService
            from app.services.email import EmailService

            for uid, uname, rname in [
                (collab.partner_id, collab.partner_name, collab.creator_name),
                (collab.creator_id, collab.creator_name, collab.partner_name),
            ]:
                NotificationService.create_notification(
                    db,
                    user_id=uid,
                    title="Collaboration Completed",
                    message=f"Collaboration deal '{collab.campaign_title}' has been completed.",
                    type="collaboration",
                    resource_type="collaboration",
                    resource_id=collab.collaboration_code,
                )
                u = db.query(User).filter(User.id == uid).first()
                if u and u.email:
                    EmailService.send_collaboration_email(
                        to_email=u.email,
                        recipient_name=uname,
                        proposal_title=collab.campaign_title,
                        sender_name=rname,
                        status_text="completed",
                    )
        except Exception:
            pass

        return cls._to_collaboration_response(collab)
