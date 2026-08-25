"""Add service moderation fields.

Revision ID: 0003_add_service_moderation_fields
Revises: 0002_create_partner_applications
Create Date: 2026-08-24 22:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from app.models.base import GUID

# revision identifiers, used by Alembic.
revision = '0003_add_service_moderation_fields'
down_revision = '0002_create_partner_applications'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('services')]
    
    if 'rejection_reason' not in columns:
        op.add_column('services', sa.Column('rejection_reason', sa.Text(), nullable=True))
    if 'reviewed_by' not in columns:
        op.add_column('services', sa.Column('reviewed_by', GUID(), nullable=True))
    if 'reviewed_at' not in columns:
        op.add_column('services', sa.Column('reviewed_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('services', 'reviewed_at')
    op.drop_column('services', 'reviewed_by')
    op.drop_column('services', 'rejection_reason')
