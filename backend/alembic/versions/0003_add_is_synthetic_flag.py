"""Add is_synthetic identification flag across domain models.

Revision ID: 0003_add_is_synthetic_flag
Revises: 0002_add_travel_preferences
Create Date: 2026-10-04
"""

from alembic import op
import sqlalchemy as sa

# Revision identifiers
revision = "0003_add_is_synthetic_flag"
down_revision = "0002_add_travel_preferences"
branch_labels = None
depends_on = None

# Tables with is_synthetic column and index
INDEXED_TABLES = [
    "users",
    "partner_applications",
    "services",
    "service_availabilities",
    "saved_services",
    "bookings",
    "payments",
    "refunds",
    "payouts",
    "reviews",
    "trips",
    "trip_days",
    "trip_items",
    "ai_trip_plans",
    "user_interactions",
    "user_interest_profiles",
    "user_similarities",
    "recommendation_results",
    "notifications",
    "ai_conversations",
    "ai_messages",
    "support_tickets",
]

# Additional analytics / recommendation tables
UNINDEXED_TABLES = [
    "recommendation_impressions",
    "recommendation_feedback",
    "nc_score_snapshots",
    "provider_daily_metrics",
    "service_daily_metrics",
    "provider_response_metrics",
    "provider_action_recommendations",
]


def upgrade() -> None:
    # 1. Indexed tables
    for tbl in INDEXED_TABLES:
        op.add_column(
            tbl,
            sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )
        op.create_index(f"ix_{tbl}_is_synthetic", tbl, ["is_synthetic"])

    # 2. Unindexed tables
    for tbl in UNINDEXED_TABLES:
        op.add_column(
            tbl,
            sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )


def downgrade() -> None:
    for tbl in UNINDEXED_TABLES:
        op.drop_column(tbl, "is_synthetic")

    for tbl in INDEXED_TABLES:
        op.drop_index(f"ix_{tbl}_is_synthetic", table_name=tbl)
        op.drop_column(tbl, "is_synthetic")
