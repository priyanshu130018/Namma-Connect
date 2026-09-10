"""Add formatted_address to services table.

Revision ID: e8f190a12345
Revises: 90c287509883
Create Date: 2026-09-09 19:25:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '1b8c4d9e2f0a'
down_revision = 'e4d0a91f3b28'
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
