"""Admin Domain Service for Platform Governance, Moderation, and Auditing."""

from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_

from app.models.user import User
from app.models.service import Service
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.payout import Payout
from app.schemas.admin import (
    AdminOverviewResponse,
    AdminUserItemResponse,
    AdminPartnerVerificationRequest,
    AdminServiceStatusRequest,
    AdminPayoutStatusRequest,
    AdminSupportTicketItem,
    AdminPlatformSettingsResponse,
)
from app.schemas.service import ServiceResponse
from app.schemas.booking import ProviderBookingResponse
from app.schemas.payout import PayoutItemResponse
from app.services.marketplace import MarketplaceService


class AdminService:
    """Service governing platform-wide moderation and operational administration."""

    @classmethod
    def get_platform_overview(cls, db: Session) -> AdminOverviewResponse:
        """Fetch consolidated platform overview metrics."""
        total_users = db.query(func.count(User.id)).scalar() or 0
        total_partners = db.query(func.count(User.id)).filter(User.role.in_(["partner", "farmer"])).scalar() or 0
        pending_verifications = db.query(func.count(User.id)).filter(
            User.role.in_(["partner", "farmer"]),
            User.is_verified == False
        ).scalar() or 0

        published_services = db.query(func.count(Service.id)).filter(Service.status == "PUBLISHED").scalar() or 0
        total_bookings = db.query(func.count(Booking.id)).scalar() or 0
        total_revenue = db.query(func.coalesce(func.sum(Booking.total_amount), 0.0)).filter(
            Booking.status.in_(["CONFIRMED", "COMPLETED"])
        ).scalar() or 0.0

        pending_payouts = db.query(func.count(Payout.id)).filter(
            Payout.status.in_(["PENDING", "PROCESSING"])
        ).scalar() or 0

        return AdminOverviewResponse(
            total_users=total_users,
            total_partners=total_partners,
            pending_verifications=pending_verifications,
            published_services=published_services,
            total_bookings=total_bookings,
            total_revenue=round(float(total_revenue), 2),
            pending_payouts=pending_payouts,
            open_support_tickets=2,
        )

    @classmethod
    def list_users(
        cls,
        db: Session,
        role: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[AdminUserItemResponse]:
        """List platform users with optional role and search filters."""
        query = db.query(User)
        if role:
            query = query.filter(User.role == role.lower())
        if search:
            s = f"%{search.lower()}%"
            query = query.filter(or_(func.lower(User.full_name).like(s), func.lower(User.email).like(s)))

        users = query.order_by(desc(User.created_at)).offset(offset).limit(limit).all()
        return [
            AdminUserItemResponse(
                id=str(u.id),
                email=u.email,
                full_name=u.full_name,
                phone=getattr(u, "mobile", None),
                role=u.role,
                is_active=u.is_active,
                is_verified=u.is_verified,
                created_at=u.created_at,
            )
            for u in users
        ]

    @classmethod
    def list_partners(cls, db: Session) -> List[AdminUserItemResponse]:
        """List all registered agricultural hosts and providers."""
        partners = db.query(User).filter(User.role.in_(["partner", "farmer"])).order_by(desc(User.created_at)).all()
        return [
            AdminUserItemResponse(
                id=str(u.id),
                email=u.email,
                full_name=u.full_name,
                phone=getattr(u, "mobile", None),
                role=u.role,
                is_active=u.is_active,
                is_verified=u.is_verified,
                created_at=u.created_at,
            )
            for u in partners
        ]

    @classmethod
    def list_verification_queue(cls, db: Session) -> List[AdminUserItemResponse]:
        """List providers pending KYC verification."""
        queue = db.query(User).filter(
            User.role.in_(["partner", "farmer"]),
            User.is_verified == False
        ).order_by(desc(User.created_at)).all()
        return [
            AdminUserItemResponse(
                id=str(u.id),
                email=u.email,
                full_name=u.full_name,
                phone=getattr(u, "mobile", None),
                role=u.role,
                is_active=u.is_active,
                is_verified=u.is_verified,
                created_at=u.created_at,
            )
            for u in queue
        ]

    @classmethod
    def verify_partner(
        cls,
        db: Session,
        user_id: str,
        req: AdminPartnerVerificationRequest,
    ) -> AdminUserItemResponse:
        """Approve or reject a provider's KYC verification status."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID '{user_id}' not found.")

        act = req.action.upper()
        if act == "APPROVE":
            user.is_verified = True
        elif act in ["REJECT", "REQUEST_CHANGES"]:
            user.is_verified = False
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid verification action '{req.action}'.")

        db.commit()
        db.refresh(user)

        return AdminUserItemResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            phone=getattr(user, "mobile", None),
            role=user.role,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
        )

    @classmethod
    def list_services(
        cls,
        db: Session,
        status_filter: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ServiceResponse]:
        """List marketplace services for administrative moderation."""
        MarketplaceService.ensure_seeded(db)
        query = db.query(Service)
        if status_filter:
            query = query.filter(func.lower(Service.status) == status_filter.lower())
        if category:
            query = query.filter(func.lower(Service.category_slug) == category.lower())

        services = query.order_by(desc(Service.created_at)).offset(offset).limit(limit).all()
        return [MarketplaceService._to_service_response(s) for s in services]

    @classmethod
    def update_service_status(
        cls,
        db: Session,
        service_id: str,
        req: AdminServiceStatusRequest,
    ) -> ServiceResponse:
        """Update marketplace service moderation status."""
        MarketplaceService.ensure_seeded(db)
        service = db.query(Service).filter(Service.id == service_id).first()
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Service with ID '{service_id}' not found.")

        new_status = req.status.upper()
        if new_status not in ["PUBLISHED", "DRAFT", "ARCHIVED", "REJECTED"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid service status '{req.status}'.")

        service.status = new_status
        db.commit()
        db.refresh(service)
        return MarketplaceService._to_service_response(service)

    @classmethod
    def list_bookings(
        cls,
        db: Session,
        status_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ProviderBookingResponse]:
        """List system-wide bookings with customer and service details."""
        query = db.query(Booking).options(
            joinedload(Booking.service),
            joinedload(Booking.customer),
            joinedload(Booking.payments),
        )
        if status_filter:
            query = query.filter(Booking.status == status_filter.upper())

        bookings = query.order_by(desc(Booking.created_at)).offset(offset).limit(limit).all()

        results: List[ProviderBookingResponse] = []
        for b in bookings:
            cust_name = b.customer.full_name if b.customer else "Traveler"
            cust_email = b.customer.email if b.customer else None
            cust_phone = b.customer.phone if b.customer else None
            srv_title = b.service.title if b.service else "Agricultural Experience"

            pay_status = "PENDING"
            if b.payments:
                if any(p.status == "PAID" for p in b.payments):
                    pay_status = "PAID"
                elif any(p.status == "FAILED" for p in b.payments):
                    pay_status = "FAILED"
            elif b.status in ["CONFIRMED", "COMPLETED"]:
                pay_status = "PAID"

            gross = float(b.total_amount)
            platform_fee = round(gross * 0.05, 2)
            net_payout = round(gross * 0.95, 2)

            results.append(
                ProviderBookingResponse(
                    id=str(b.id),
                    booking_code=b.booking_code,
                    service_id=str(b.service_id),
                    service_title=srv_title,
                    customer_id=str(b.customer_id),
                    customer_name=cust_name,
                    customer_email=cust_email,
                    customer_phone=cust_phone,
                    start_date=b.start_date,
                    end_date=b.end_date,
                    time_slot_label=b.time_slot_label,
                    guest_count=b.guest_count,
                    unit_price=b.unit_price,
                    total_amount=gross,
                    platform_fee=platform_fee,
                    net_payout=net_payout,
                    status=b.status,
                    payment_status=pay_status,
                    special_instructions=b.special_instructions,
                    created_at=b.created_at,
                )
            )

        return results

    @classmethod
    def list_payouts(cls, db: Session, limit: int = 50, offset: int = 0) -> List[PayoutItemResponse]:
        """List provider payout records."""
        payouts = db.query(Payout).order_by(desc(Payout.created_at)).offset(offset).limit(limit).all()
        return [
            PayoutItemResponse(
                id=str(p.id),
                payout_code=p.payout_code,
                provider_id=str(p.provider_id),
                amount=p.amount,
                currency=p.currency,
                status=p.status,
                beneficiary_name=p.beneficiary_name,
                bank_account_last4=p.bank_account_last4,
                ifsc_code=p.ifsc_code,
                failure_reason=p.failure_reason,
                created_at=p.created_at,
                processed_at=p.processed_at,
            )
            for p in payouts
        ]

    @classmethod
    def update_payout_status(
        cls,
        db: Session,
        payout_id: str,
        req: AdminPayoutStatusRequest,
    ) -> PayoutItemResponse:
        """Update payout settlement status."""
        payout = db.query(Payout).filter(Payout.id == payout_id).first()
        if not payout:
            payout = db.query(Payout).filter(Payout.payout_code == payout_id).first()
        if not payout:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Payout with ID '{payout_id}' not found.")

        new_status = req.status.upper()
        if new_status not in ["COMPLETED", "FAILED", "PROCESSING"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid payout status '{req.status}'.")

        payout.status = new_status
        if req.failure_reason:
            payout.failure_reason = req.failure_reason
        if new_status == "COMPLETED":
            payout.processed_at = datetime.utcnow()

        db.commit()
        db.refresh(payout)

        return PayoutItemResponse(
            id=str(payout.id),
            payout_code=payout.payout_code,
            provider_id=str(payout.provider_id),
            amount=payout.amount,
            currency=payout.currency,
            status=payout.status,
            beneficiary_name=payout.beneficiary_name,
            bank_account_last4=payout.bank_account_last4,
            ifsc_code=payout.ifsc_code,
            failure_reason=payout.failure_reason,
            created_at=payout.created_at,
            processed_at=payout.processed_at,
        )

    @classmethod
    def list_support_tickets(cls, db: Optional[Session] = None) -> List[AdminSupportTicketItem]:
        """List platform support inquiries."""
        if db is not None:
            from app.services.support import SupportService
            return SupportService.list_admin_tickets(db)

        return [
            AdminSupportTicketItem(
                id="NC-TICK-1001",
                user_email="aravind@example.com",
                user_name="Aravind Swamy",
                subject="Inquiry regarding farm tour timings",
                category="Booking Inquiry",
                status="OPEN",
                priority="MEDIUM",
                created_at=datetime.utcnow(),
            ),
            AdminSupportTicketItem(
                id="NC-TICK-1002",
                user_email="host.plantation@example.com",
                user_name="Plantation Host",
                subject="Question about weekend availability settings",
                category="Host Support",
                status="IN_PROGRESS",
                priority="LOW",
                created_at=datetime.utcnow(),
            ),
        ]

    @classmethod
    def get_platform_settings(cls) -> AdminPlatformSettingsResponse:
        """Retrieve global platform configuration."""
        return AdminPlatformSettingsResponse(
            platform_name="NammaConnect",
            commission_rate=0.05,
            currency="INR",
            environment="production",
            is_maintenance_mode=False,
            support_email="support@nammaconnect.in",
        )

    @classmethod
    def list_collaborations(cls, db: Session, limit: int = 50, offset: int = 0):
        """Admin governance: list all platform creator & host collaboration deals."""
        from app.models.collaboration import Collaboration
        from app.services.creator import CreatorService

        CreatorService.ensure_seeded(db)
        collabs = (
            db.query(Collaboration)
            .order_by(Collaboration.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return [CreatorService._to_collaboration_response(c) for c in collabs]
