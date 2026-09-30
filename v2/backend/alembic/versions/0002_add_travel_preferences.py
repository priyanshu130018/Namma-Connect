"""Add travel_preferences column to users.

Adds a nullable serialized-JSON column that stores the customer's travel
preferences (travel style, budget style, interests, trip type, food and
walking preferences, and AI planning toggles). Consumed by the AI Trip
Planner. NULL means "not set yet".

Revision ID: 0002_add_travel_preferences
Revises: 0001_initial_namma_connect_v2
Create Date: 2026-09-28
"""

from alembic import op
import sqlalchemy as sa

# Revision identifiers
revision = "0002_add_travel_preferences"
down_revision = "0001_initial_namma_connect_v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("travel_preferences", sa.String(length=2048), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "travel_preferences")
