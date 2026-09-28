"""Add user profile fields, notification is_deletable flag, and OTP fields.

Revision ID: 013_user_profile_fields_and_notifications
Revises: 012_settings_and_email_logs
Create Date: 2026-09-15
"""

from alembic import op
import sqlalchemy as sa


revision = '013_user_profile_fields_and_notifications'
down_revision = '012_settings_and_email_logs'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. Add profile and OTP columns to users table if missing
    user_columns = [col['name'] for col in inspector.get_columns('users')]

    if 'bio' not in user_columns:
        op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    if 'gender' not in user_columns:
        op.add_column('users', sa.Column('gender', sa.String(length=32), nullable=True))
    if 'date_of_birth' not in user_columns:
        op.add_column('users', sa.Column('date_of_birth', sa.String(length=32), nullable=True))
    if 'tags_json' not in user_columns:
        op.add_column('users', sa.Column('tags_json', sa.Text(), nullable=False, server_default='[]'))
    if 'password_otp_hash' not in user_columns:
        op.add_column('users', sa.Column('password_otp_hash', sa.String(length=255), nullable=True))
    if 'password_otp_expires_at' not in user_columns:
        op.add_column('users', sa.Column('password_otp_expires_at', sa.DateTime(), nullable=True))
    if 'email_otp_hash' not in user_columns:
        op.add_column('users', sa.Column('email_otp_hash', sa.String(length=255), nullable=True))
    if 'email_otp_expires_at' not in user_columns:
        op.add_column('users', sa.Column('email_otp_expires_at', sa.DateTime(), nullable=True))

    # 2. Add is_deletable column to notifications table if missing
    notif_columns = [col['name'] for col in inspector.get_columns('notifications')]
    if 'is_deletable' not in notif_columns:
        op.add_column('notifications', sa.Column('is_deletable', sa.Boolean(), nullable=False, server_default=sa.text('TRUE')))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    notif_columns = [col['name'] for col in inspector.get_columns('notifications')]
    if 'is_deletable' in notif_columns:
        op.drop_column('notifications', 'is_deletable')

    user_columns = [col['name'] for col in inspector.get_columns('users')]
    for col_name in ['email_otp_expires_at', 'email_otp_hash', 'password_otp_expires_at', 'password_otp_hash', 'tags_json', 'date_of_birth', 'gender', 'bio']:
        if col_name in user_columns:
            op.drop_column('users', col_name)
