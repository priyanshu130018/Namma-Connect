"""Add platform_settings and email_logs tables.

Revision ID: 012_platform_settings_and_email_logs
Revises: 011_add_content_translations
Create Date: 2026-09-13
"""

from alembic import op
import sqlalchemy as sa
from app.models.base import GUID


# revision identifiers, used by Alembic.
revision = '012_settings_and_email_logs'
down_revision = '011_add_content_translations'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # Ensure alembic_version table supports longer revision identifiers
    if 'alembic_version' in existing_tables:
        op.execute("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(255);")

    # 1. Create platform_settings table if it doesn't already exist
    if 'platform_settings' not in existing_tables:
        op.create_table(
            'platform_settings',
            sa.Column('key', sa.String(length=64), primary_key=True),
            sa.Column('value', sa.Text(), nullable=False),
            sa.Column('description', sa.String(length=256), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        )
        op.create_index('ix_platform_settings_key', 'platform_settings', ['key'], unique=False)

    # 2. Create email_logs table if it doesn't already exist
    if 'email_logs' not in existing_tables:
        op.create_table(
            'email_logs',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('recipient', sa.String(length=255), nullable=False),
            sa.Column('event_type', sa.String(length=50), nullable=False),
            sa.Column('subject', sa.String(length=255), nullable=False),
            sa.Column('resend_message_id', sa.String(length=128), nullable=True),
            sa.Column('status', sa.String(length=32), nullable=False, server_default='sent'),
            sa.Column('error', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        )
        op.create_index('ix_email_logs_user_id', 'email_logs', ['user_id'], unique=False)
        op.create_index('ix_email_logs_recipient', 'email_logs', ['recipient'], unique=False)
        op.create_index('ix_email_logs_event_type', 'email_logs', ['event_type'], unique=False)
        op.create_index('idx_email_log_recipient_created', 'email_logs', ['recipient', 'created_at'], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'email_logs' in existing_tables:
        op.drop_index('idx_email_log_recipient_created', table_name='email_logs')
        op.drop_index('ix_email_logs_event_type', table_name='email_logs')
        op.drop_index('ix_email_logs_recipient', table_name='email_logs')
        op.drop_index('ix_email_logs_user_id', table_name='email_logs')
        op.drop_table('email_logs')

    if 'platform_settings' in existing_tables:
        op.drop_index('ix_platform_settings_key', table_name='platform_settings')
        op.drop_table('platform_settings')
