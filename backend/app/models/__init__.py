"""Central SQLAlchemy Metadata Registry and Model Exports for Namma Connect V2.

All models are canonically organized under app.modules.<module>.domain.models and registered
against the single authoritative Declarative Base metadata.
"""

from app.models.base import Base, GUID, TimestampMixin

# Canonical Modular Models
from app.modules.user.domain.models import User
from app.modules.provider.domain.models import PartnerApplication
from app.modules.marketplace.domain.models import (
    MarketplaceCategory,
    Service,
    ServiceAvailability,
    SavedService,
    ContentTranslation,
)
from app.modules.booking.domain.models import Booking
from app.modules.payment.domain.models import Payment, Refund, Payout
from app.modules.review.domain.models import Review
from app.modules.notification.domain.models import Notification, EmailLog
from app.modules.messaging.domain.models import Conversation, Message
from app.modules.trip.domain.models import Trip, TripDay, TripItem, AITripPlan
from app.modules.recommendation.domain.models import (
    UserInteraction,
    UserInterestProfile,
    UserSimilarity,
    RecommendationResult,
    RecommendationImpression,
    RecommendationFeedback,
)
from app.modules.ai.domain.models import AIConversation, AIMessage
from app.modules.analytics.domain.models import (
    NCScoreSnapshot,
    ProviderDailyMetrics,
    ServiceDailyMetrics,
    ProviderResponseMetrics,
    ProviderActionRecommendation,
)
from app.modules.support.domain.models import SupportTicket
from app.modules.admin.domain.models import PlatformSetting

__all__ = [
    "Base",
    "GUID",
    "TimestampMixin",
    "User",
    "PartnerApplication",
    "MarketplaceCategory",
    "Service",
    "ServiceAvailability",
    "SavedService",
    "ContentTranslation",
    "Booking",
    "Payment",
    "Refund",
    "Payout",
    "Review",
    "Notification",
    "EmailLog",
    "Conversation",
    "Message",
    "Trip",
    "TripDay",
    "TripItem",
    "AITripPlan",
    "UserInteraction",
    "UserInterestProfile",
    "UserSimilarity",
    "RecommendationResult",
    "RecommendationImpression",
    "RecommendationFeedback",
    "AIConversation",
    "AIMessage",
    "NCScoreSnapshot",
    "ProviderDailyMetrics",
    "ServiceDailyMetrics",
    "ProviderResponseMetrics",
    "ProviderActionRecommendation",
    "SupportTicket",
    "PlatformSetting",
]
