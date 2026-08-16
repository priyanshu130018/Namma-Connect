"""fix_schema_mismatches

Revision ID: f1b2c3d4e5f6
Revises: e0fda819dada
Create Date: 2026-08-16 23:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'e0fda819dada'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. bookings table: add start_time, end_time, currency and drop not null on legacy adults/children
    op.execute("""
        ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS start_time TIME NULL,
        ADD COLUMN IF NOT EXISTS end_time TIME NULL,
        ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR';
    """)

    op.execute("""
        ALTER TABLE bookings 
        ALTER COLUMN adults DROP NOT NULL,
        ALTER COLUMN children DROP NOT NULL;
    """)

    # 2. payments table: add currency
    op.execute("""
        ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR';
    """)

    # 3. messages table: rename column content to message
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name='messages' AND column_name='content'
            ) THEN
                ALTER TABLE messages RENAME COLUMN content TO message;
            END IF;
        END $$;
    """)

def downgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name='messages' AND column_name='message'
            ) THEN
                ALTER TABLE messages RENAME COLUMN message TO content;
            END IF;
        END $$;
    """)
    op.execute("""
        ALTER TABLE payments DROP COLUMN IF EXISTS currency;
    """)
    op.execute("""
        ALTER TABLE bookings 
        DROP COLUMN IF EXISTS start_time,
        DROP COLUMN IF EXISTS end_time,
        DROP COLUMN IF EXISTS currency;
    """)
