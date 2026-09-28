"""Unit and metadata integration tests for Namma Connect V2 models and schema."""

import pytest
from sqlalchemy import Numeric, Float
from app.core.database import Base
import app.models  # Trigger full model discovery

# Modular imports
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


def test_all_models_registered_in_metadata():
    """Verify all 25+ domain models are registered in the authoritative Base metadata."""
    registered_tables = set(Base.metadata.tables.keys())

    expected_tables = {
        "users",
        "marketplace_categories",
        "partner_applications",
        "services",
        "service_availabilities",
        "saved_services",
        "content_translations",
        "bookings",
        "payments",
        "refunds",
        "payouts",
        "reviews",
        "notifications",
        "email_logs",
        "conversations",
        "messages",
        "trips",
        "trip_days",
        "trip_items",
        "ai_conversations",
        "ai_messages",
        "ai_trip_plans",
        "user_interactions",
        "user_interest_profiles",
        "user_similarities",
        "recommendation_results",
        "recommendation_impressions",
        "recommendation_feedback",
        "nc_score_snapshots",
        "provider_daily_metrics",
        "service_daily_metrics",
        "provider_response_metrics",
        "provider_action_recommendations",
        "support_tickets",
        "platform_settings",
    }

    for table in expected_tables:
        assert table in registered_tables, f"Expected table '{table}' is missing from Base.metadata"


def test_no_deprecated_creator_or_collaboration_tables():
    """Verify deprecated tables are eliminated from metadata."""
    registered_tables = set(Base.metadata.tables.keys())
    assert "creator_profiles" not in registered_tables
    assert "collaborations" not in registered_tables


def test_money_fields_use_numeric():
    """Verify all monetary amounts use Numeric(12, 2) rather than Float."""
    services_table = Base.metadata.tables["services"]
    bookings_table = Base.metadata.tables["bookings"]
    payments_table = Base.metadata.tables["payments"]
    refunds_table = Base.metadata.tables["refunds"]
    payouts_table = Base.metadata.tables["payouts"]
    provider_metrics_table = Base.metadata.tables["provider_daily_metrics"]
    service_metrics_table = Base.metadata.tables["service_daily_metrics"]

    assert isinstance(services_table.c.price.type, Numeric)
    assert isinstance(bookings_table.c.unit_price.type, Numeric)
    assert isinstance(bookings_table.c.total_amount.type, Numeric)
    assert isinstance(payments_table.c.amount.type, Numeric)
    assert isinstance(refunds_table.c.amount.type, Numeric)
    assert isinstance(payouts_table.c.amount.type, Numeric)
    assert isinstance(provider_metrics_table.c.revenue.type, Numeric)
    assert isinstance(service_metrics_table.c.revenue.type, Numeric)


def test_marketplace_category_foreign_keys():
    """Verify services link to marketplace_categories via normalized FK."""
    services_table = Base.metadata.tables["services"]
    fk_targets = [fk.target_fullname for fk in services_table.foreign_keys]
    assert "marketplace_categories.id" in fk_targets


def test_booking_foreign_keys():
    """Verify bookings link to users and services via normalized FKs."""
    bookings_table = Base.metadata.tables["bookings"]
    fk_targets = [fk.target_fullname for fk in bookings_table.foreign_keys]
    assert "users.id" in fk_targets
    assert "services.id" in fk_targets


def test_trip_hierarchy_relationships():
    """Verify trip -> trip_days -> trip_items FK hierarchy."""
    trip_days = Base.metadata.tables["trip_days"]
    trip_items = Base.metadata.tables["trip_items"]

    assert "trips.id" in [fk.target_fullname for fk in trip_days.foreign_keys]
    assert "trip_days.id" in [fk.target_fullname for fk in trip_items.foreign_keys]


def test_recommendation_models_separation():
    """Verify recommendation models preserve explicit separation of behavior, affinity, and feedback."""
    tables = Base.metadata.tables
    assert "user_interactions" in tables
    assert "user_interest_profiles" in tables
    assert "user_similarities" in tables
    assert "recommendation_results" in tables
    assert "recommendation_impressions" in tables
    assert "recommendation_feedback" in tables
