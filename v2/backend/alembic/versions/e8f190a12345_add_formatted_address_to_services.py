"""Add formatted_address to services table.

Revision ID: e8f190a12345
Revises: 90c287509883
Create Date: 2026-09-09 19:25:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e8f190a12345'
down_revision = '0004_add_is_test_data_and_pgvector_embedding'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('services')]
    
    if 'formatted_address' not in columns:
        op.add_column('services', sa.Column('formatted_address', sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column('services', 'formatted_address')
