"""Normalize legacy roles and enforce canonical role CHECK constraint ('user', 'provider', 'admin').

Revision ID: a1b2c3d4e5f6
Revises: f9e8d7c6b5a4
Create Date: 2026-09-13 10:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'f9e8d7c6b5a4'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    # 1. Normalize existing legacy role data
    op.execute(sa.text("UPDATE users SET role = 'user' WHERE role = 'customer'"))
    op.execute(sa.text("UPDATE users SET role = 'provider' WHERE role IN ('partner', 'farmer', 'creator')"))
    op.execute(sa.text("UPDATE users SET role = 'admin' WHERE role IN ('support', 'moderator')"))

    # 2. Update default value on role column to 'user'
    if dialect == "postgresql":
        op.alter_column('users', 'role', server_default='user')
        # 3. Add PostgreSQL CHECK constraint
        op.create_check_constraint(
            'chk_users_canonical_role',
            'users',
            "role IN ('user', 'provider', 'admin')"
        )
    elif dialect == "sqlite":
        # SQLite does not support adding check constraints to existing tables directly via ALTER TABLE
        pass


def downgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name
    if dialect == "postgresql":
        op.drop_constraint('chk_users_canonical_role', 'users', type_='check')
