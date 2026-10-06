"""Add service moderation fields.

Revision ID: 90c287509883
Revises: 3bf23c0933a9
Create Date: 2026-08-24 22:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from app.models.base import GUID

# revision identifiers, used by Alembic.
revision = '5e2b8f1c4a90'
down_revision = '7d9a1e4b2c83'
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
