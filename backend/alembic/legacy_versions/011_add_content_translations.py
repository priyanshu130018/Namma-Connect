"""Add content_translations table for dynamic content localization.

Revision ID: 011_add_content_translations
Revises: 010_enforce_canonical_roles_and_check_constraint
Create Date: 2026-09-13
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '011_add_content_translations'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create content_translations table
    op.create_table(
        'content_translations',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('resource_type', sa.String(length=50), nullable=False),
        sa.Column('resource_id', sa.String(length=100), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False),
        sa.Column('field_name', sa.String(length=50), nullable=False),
        sa.Column('translated_text', sa.Text(), nullable=False),
        sa.Column('source_language', sa.String(length=10), server_default='en', nullable=False),
        sa.Column('is_stale', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )

    op.create_index(
        'ix_content_translations_lookup',
        'content_translations',
        ['resource_type', 'resource_id', 'language', 'field_name'],
        unique=True,
    )
    op.create_index(
        'ix_content_translations_stale',
        'content_translations',
        ['is_stale'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_content_translations_stale', table_name='content_translations')
    op.drop_index('ix_content_translations_lookup', table_name='content_translations')
    op.drop_table('content_translations')
