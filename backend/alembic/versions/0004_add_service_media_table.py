"""Add service_media table for Cloudinary-backed asset management.

Revision ID: 0004_add_service_media_table
Revises: 0003_add_is_synthetic_flag
Create Date: 2026-10-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Revision identifiers
revision = "0004_add_service_media_table"
down_revision = "0003_add_is_synthetic_flag"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "service_media",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("service_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False),
        sa.Column("storage_provider", sa.String(length=50), nullable=False, server_default="cloudinary"),
        sa.Column("storage_key", sa.String(length=500), nullable=False),
        sa.Column("secure_url", sa.String(length=1000), nullable=False),
        sa.Column("media_type", sa.String(length=50), nullable=False, server_default="image"),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="gallery"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("format", sa.String(length=20), nullable=True),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    op.create_index("ix_service_media_service_id", "service_media", ["service_id"])
    op.create_index("ix_service_media_storage_key", "service_media", ["storage_key"])
    op.create_index("ix_service_media_is_synthetic", "service_media", ["is_synthetic"])
    op.create_index("idx_service_media_lookup", "service_media", ["service_id", "role", "sort_order"])


def downgrade() -> None:
    op.drop_index("idx_service_media_lookup", table_name="service_media")
    op.drop_index("ix_service_media_is_synthetic", table_name="service_media")
    op.drop_index("ix_service_media_storage_key", table_name="service_media")
    op.drop_index("ix_service_media_service_id", table_name="service_media")
    op.drop_table("service_media")
