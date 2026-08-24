"""Root API v2 aggregation router."""

from fastapi import APIRouter
from app.api.v2.endpoints.auth import router as auth_router
from app.api.v2.endpoints.search import router as search_router
from app.api.v2.endpoints.services import router as services_router
from app.api.v2.endpoints.bookings import router as bookings_router
from app.api.v2.endpoints.payments import router as payments_router
from app.api.v2.endpoints.earnings import router as earnings_router
from app.api.v2.endpoints.payouts import router as payouts_router
from app.api.v2.endpoints.admin import router as admin_router
from app.api.v2.endpoints.creators import router as creators_router
from app.api.v2.endpoints.collaborations import router as collaborations_router
from app.api.v2.endpoints.notifications import router as notifications_router
from app.api.v2.endpoints.messages import router as messages_router
from app.api.v2.endpoints.support import router as support_router
from app.api.v2.endpoints.users import router as users_router
from app.api.v2.endpoints.ai import router as ai_router
from app.api.v2.endpoints.partner_applications import (
    router as partner_application_router,
    admin_router as admin_partner_application_router,
)

api_v2_router = APIRouter()

api_v2_router.include_router(auth_router)
api_v2_router.include_router(search_router)
api_v2_router.include_router(services_router)
api_v2_router.include_router(bookings_router)
api_v2_router.include_router(payments_router)
api_v2_router.include_router(earnings_router)
api_v2_router.include_router(payouts_router)
api_v2_router.include_router(admin_router)
api_v2_router.include_router(creators_router)
api_v2_router.include_router(collaborations_router)
api_v2_router.include_router(notifications_router)
api_v2_router.include_router(messages_router)
api_v2_router.include_router(support_router)
api_v2_router.include_router(users_router)
api_v2_router.include_router(ai_router)
api_v2_router.include_router(partner_application_router)
api_v2_router.include_router(admin_partner_application_router)
