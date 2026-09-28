"""Add indexes for Celery background tasks, user similarities, and precomputed recommendation queries.

Revision ID: e8d7c6b5a4f3
Revises: a9b8c7d6e5f4
Create Date: 2026-09-10 23:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e8d7c6b5a4f3'
down_revision = 'a9b8c7d6e5f4'
branch_labels = None
depends_on = None


def upgrade():
    # Performance indexes for similarity matrix queries
    op.create_index('ix_user_similarities_a_b', 'user_similarities', ['user_id_1', 'user_id_2'], unique=False)
    op.create_index('ix_user_similarities_b_a', 'user_similarities', ['user_id_2', 'user_id_1'], unique=False)
    # Index for user interaction decay recalculations
    op.create_index('ix_user_interactions_user_created', 'user_interactions', ['user_id', 'created_at'], unique=False)
    # Index for NC Score historical snapshot lookups
    op.create_index('ix_nc_score_snapshots_provider_calc', 'nc_score_snapshots', ['provider_id', 'calculated_at'], unique=False)


def downgrade():
    op.drop_index('ix_nc_score_snapshots_provider_calc', table_name='nc_score_snapshots')
    op.drop_index('ix_user_interactions_user_created', table_name='user_interactions')
    op.drop_index('ix_user_similarities_b_a', table_name='user_similarities')
    op.drop_index('ix_user_similarities_a_b', table_name='user_similarities')
