"""Add indexes and columns for Admin reviews moderation and governance.

Revision ID: f9e8d7c6b5a4
Revises: e8d7c6b5a4f3
Create Date: 2026-09-13 01:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f9e8d7c6b5a4'
down_revision = 'e8d7c6b5a4f3'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    review_columns = [c['name'] for c in inspector.get_columns('reviews')]
    
    if 'status' not in review_columns:
        op.add_column('reviews', sa.Column('status', sa.String(50), nullable=False, server_default='PUBLISHED'))
    
    # Indexes for admin moderation and reports
    indexes = [idx['name'] for idx in inspector.get_indexes('reviews')]
    if 'ix_reviews_status' not in indexes:
        op.create_index('ix_reviews_status', 'reviews', ['status'], unique=False)
    if 'ix_reviews_rating' not in indexes:
        op.create_index('ix_reviews_rating', 'reviews', ['rating'], unique=False)


def downgrade():
    op.drop_index('ix_reviews_rating', table_name='reviews')
    op.drop_index('ix_reviews_status', table_name='reviews')
