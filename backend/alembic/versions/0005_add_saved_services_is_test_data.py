"""Add is_test_data to saved_services table.

Revision ID: 0005_add_saved_services_is_test_data
Revises: 0004_add_service_media_table
Create Date: 2026-10-08
"""

from alembic import op
import sqlalchemy as sa

# Revision identifiers
revision = "0005_add_saved_services_is_test_data"
down_revision = "0004_add_service_media_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c["name"] for c in inspector.get_columns("saved_services")]
    if "is_test_data" not in cols:
        op.add_column(
            "saved_services",
            sa.Column("is_test_data", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )
        op.create_index("ix_saved_services_is_test_data", "saved_services", ["is_test_data"])


def downgrade() -> None:
    op.drop_index("ix_saved_services_is_test_data", table_name="saved_services")
    op.drop_column("saved_services", "is_test_data")
