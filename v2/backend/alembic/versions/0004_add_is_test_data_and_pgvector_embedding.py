"""Add is_test_data flags and pgvector embedding column.

Revision ID: 0004_add_is_test_data_and_pgvector_embedding
Revises: 0003_add_service_moderation_fields
Create Date: 2026-08-24 23:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = '0004_add_is_test_data_and_pgvector_embedding'
down_revision = '0003_add_service_moderation_fields'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    
    # 1. Enable pgvector extension on PostgreSQL if available
    try:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    except Exception:
        pass

    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 2. Add is_test_data column to tables
    tables_to_update = [
        'users',
        'services',
        'reviews',
        'partner_applications',
        'bookings',
        'payments',
        'notifications',
        'creator_profiles',
        'support_tickets',
        'saved_services',
    ]

    for tbl in tables_to_update:
        if tbl in tables:
            cols = [c['name'] for c in inspector.get_columns(tbl)]
            if 'is_test_data' not in cols:
                op.add_column(tbl, sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default=sa.text('false')))
                try:
                    op.create_index(f'ix_{tbl}_is_test_data', tbl, ['is_test_data'])
                except Exception:
                    pass

    # 3. Add embedding column to services
    if 'services' in tables:
        service_cols = [c['name'] for c in inspector.get_columns('services')]
        if 'embedding' not in service_cols:
            op.add_column('services', sa.Column('embedding', Vector(768), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'services' in tables:
        service_cols = [c['name'] for c in inspector.get_columns('services')]
        if 'embedding' in service_cols:
            op.drop_column('services', 'embedding')

    tables_to_update = [
        'saved_services',
        'support_tickets',
        'creator_profiles',
        'notifications',
        'payments',
        'bookings',
        'partner_applications',
        'reviews',
        'services',
        'users',
    ]

    for tbl in tables_to_update:
        if tbl in tables:
            cols = [c['name'] for c in inspector.get_columns(tbl)]
            if 'is_test_data' in cols:
                try:
                    op.drop_index(f'ix_{tbl}_is_test_data', table_name=tbl)
                except Exception:
                    pass
                op.drop_column(tbl, 'is_test_data')
