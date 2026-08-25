"""Admin endpoints protected by Admin RBAC."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_admin
from app.models.user import User
from app.models.payment import Payment
from app.schemas.common import APIResponse, MessageResponse
from app.schemas.admin import (
    AdminOverviewResponse,
    AdminUserItemResponse,
    AdminPartnerVerificationRequest,
    AdminServiceStatusRequest,
    AdminServiceRejectRequest,
    AdminServiceRemoveRequest,
    AdminProviderBlockRequest,
    AdminPayoutStatusRequest,
    AdminSupportTicketItem,
    AdminPlatformSettingsResponse,
)
from app.schemas.service import ServiceResponse
from app.schemas.booking import ProviderBookingResponse
from app.schemas.payout import PayoutItemResponse
from app.schemas.refund import RefundListResponse
from app.services.admin import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/status")
def admin_status():
    """Admin console status endpoint."""
    return MessageResponse(
        success=True,
        message="Admin console endpoint operational",
        data={"status": "active"},
    )


@router.get("/overview", response_model=APIResponse[AdminOverviewResponse])
def get_admin_overview(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin platform overview metrics."""
    data = AdminService.get_platform_overview(db)
    return APIResponse(
        success=True,
        message="Admin platform overview retrieved successfully",
        data=data,
    )


@router.get("/users", response_model=APIResponse[List[AdminUserItemResponse]])
def list_admin_users(
    role: Optional[str] = Query(None, description="Filter by user role"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List platform users with optional role and search filters."""
    users = AdminService.list_users(db, role=role, search=search, limit=limit, offset=offset)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(users)} users",
        data=users,
    )


@router.get("/partners", response_model=APIResponse[List[AdminUserItemResponse]])
def list_admin_partners(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List registered agricultural hosts and providers."""
    partners = AdminService.list_partners(db)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(partners)} partner hosts",
        data=partners,
    )


@router.get("/partners/verification", response_model=APIResponse[List[AdminUserItemResponse]])
def list_admin_verification_queue(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List providers pending KYC verification."""
    queue = AdminService.list_verification_queue(db)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(queue)} pending verifications",
        data=queue,
    )


@router.post("/partners/{user_id}/verify", response_model=APIResponse[AdminUserItemResponse])
def verify_partner(
    user_id: str,
    req: AdminPartnerVerificationRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Approve or reject a provider's KYC verification."""
    user = AdminService.verify_partner(db, user_id, req)
    return APIResponse(
        success=True,
        message=f"Partner verification action '{req.action}' recorded successfully",
        data=user,
    )


@router.get("/services", response_model=APIResponse[List[ServiceResponse]])
def list_admin_services(
    status: Optional[str] = Query(None, description="Filter by status (PUBLISHED, DRAFT, ARCHIVED, REJECTED)"),
    category: Optional[str] = Query(None, description="Filter by category slug"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List marketplace services for administrative moderation."""
    services = AdminService.list_services(db, status_filter=status, category=category, limit=limit, offset=offset)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(services)} services",
        data=services,
    )


@router.get("/services/{service_id}", response_model=APIResponse[ServiceResponse])
def get_admin_service_detail(
    service_id: str,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get full details of a service for admin inspection."""
    service = AdminService.get_service_by_id(db, service_id)
    return APIResponse(
        success=True,
        message="Service details retrieved successfully",
        data=service,
    )


@router.post("/services/{service_id}/approve", response_model=APIResponse[ServiceResponse])
def approve_admin_service(
    service_id: str,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Approve a pending service listing and publish it to the marketplace."""
    service = AdminService.approve_service(db, service_id, _admin)
    return APIResponse(
        success=True,
        message=f"Service listing '{service.title}' approved and published successfully",
        data=service,
    )


@router.post("/services/{service_id}/reject", response_model=APIResponse[ServiceResponse])
def reject_admin_service(
    service_id: str,
    req: AdminServiceRejectRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Reject a pending service listing with mandatory feedback reason."""
    service = AdminService.reject_service(db, service_id, _admin, req.rejection_reason)
    return APIResponse(
        success=True,
        message=f"Service listing '{service.title}' rejected successfully",
        data=service,
    )


@router.post("/services/{service_id}/remove", response_model=APIResponse[ServiceResponse])
def remove_admin_service(
    service_id: str,
    req: AdminServiceRemoveRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Remove/unpublish an active or fraudulent service listing from the marketplace."""
    service = AdminService.remove_service(db, service_id, _admin, req.removal_reason)
    return APIResponse(
        success=True,
        message=f"Service listing '{service.title}' removed from marketplace",
        data=service,
    )


@router.post("/providers/{provider_id}/block", response_model=APIResponse[AdminUserItemResponse])
def block_provider(
    provider_id: str,
    req: AdminProviderBlockRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Suspend/block a provider and remove all their services from marketplace."""
    user = AdminService.block_provider(db, provider_id, _admin, req.reason)
    return APIResponse(
        success=True,
        message=f"Provider '{user.full_name}' has been blocked and listings removed",
        data=user,
    )


@router.post("/providers/{provider_id}/unblock", response_model=APIResponse[AdminUserItemResponse])
def unblock_provider(
    provider_id: str,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Unblock/restore a provider account."""
    user = AdminService.unblock_provider(db, provider_id, _admin)
    return APIResponse(
        success=True,
        message=f"Provider '{user.full_name}' has been unblocked",
        data=user,
    )


@router.post("/services/{service_id}/status", response_model=APIResponse[ServiceResponse])
def update_service_status(
    service_id: str,
    req: AdminServiceStatusRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update marketplace service moderation status."""
    service = AdminService.update_service_status(db, service_id, req)
    return APIResponse(
        success=True,
        message=f"Service status updated to '{req.status}'",
        data=service,
    )


@router.get("/bookings", response_model=APIResponse[List[ProviderBookingResponse]])
def list_admin_bookings(
    status: Optional[str] = Query(None, description="Filter by status (PENDING, CONFIRMED, COMPLETED, CANCELLED)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List global bookings with customer and service details."""
    bookings = AdminService.list_bookings(db, status_filter=status, limit=limit, offset=offset)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(bookings)} bookings",
        data=bookings,
    )


@router.get("/payments")
def list_admin_payments(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List payment audit records (safe fields only)."""
    payments = db.query(Payment).order_by(Payment.created_at.desc()).offset(offset).limit(limit).all()
    safe_payments = [
        {
            "id": str(p.id),
            "booking_id": str(p.booking_id),
            "customer_id": str(p.customer_id),
            "razorpay_order_id": p.razorpay_order_id,
            "razorpay_payment_id": p.razorpay_payment_id,
            "amount": p.amount,
            "currency": p.currency,
            "status": p.status,
            "method": p.method,
            "created_at": p.created_at,
        }
        for p in payments
    ]
    return APIResponse(
        success=True,
        message=f"Retrieved {len(safe_payments)} payment audit records",
        data=safe_payments,
    )


@router.get("/refunds", response_model=APIResponse[RefundListResponse])
def list_admin_refunds(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all platform refund records."""
    from app.services.refund import RefundService
    refunds = RefundService.list_admin_refunds(db)
    return APIResponse(
        success=True,
        message=f"Retrieved {refunds.total} refund records",
        data=refunds,
    )


@router.get("/payouts", response_model=APIResponse[List[PayoutItemResponse]])
def list_admin_payouts(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List provider payout records."""
    payouts = AdminService.list_payouts(db, limit=limit, offset=offset)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(payouts)} payouts",
        data=payouts,
    )


@router.post("/payouts/{payout_id}/status", response_model=APIResponse[PayoutItemResponse])
def update_payout_status(
    payout_id: str,
    req: AdminPayoutStatusRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update payout settlement status."""
    payout = AdminService.update_payout_status(db, payout_id, req)
    return APIResponse(
        success=True,
        message=f"Payout status updated to '{req.status}'",
        data=payout,
    )


@router.get("/support", response_model=APIResponse[List[AdminSupportTicketItem]])
def list_admin_support_tickets(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List customer and host support inquiries."""
    tickets = AdminService.list_support_tickets(db)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(tickets)} support inquiries",
        data=tickets,
    )


@router.get("/settings", response_model=APIResponse[AdminPlatformSettingsResponse])
def get_admin_settings(_admin: User = Depends(require_admin)):
    """Retrieve global platform configuration."""
    settings_data = AdminService.get_platform_settings()
    return APIResponse(
        success=True,
        message="Platform settings retrieved successfully",
        data=settings_data,
    )


@router.get("/collaborations")
def list_admin_collaborations(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin oversight: list all creator and partner collaborations."""
    collabs = AdminService.list_collaborations(db, limit=limit, offset=offset)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(collabs)} collaborations",
        data=collabs,
    )
