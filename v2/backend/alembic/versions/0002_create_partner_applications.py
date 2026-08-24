"""Create partner applications table.

Revision ID: 0002_create_partner_applications
Revises: 0001_initial_core_schema
Create Date: 2026-08-24 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from app.models.base import GUID

# revision identifiers, used by Alembic.
revision = '0002_create_partner_applications'
down_revision = '0001_initial_core_schema'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'partner_applications',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('application_code', sa.String(length=32), nullable=False),
        sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role_type', sa.String(length=50), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('mobile', sa.String(length=32), nullable=False),
        sa.Column('address', sa.String(length=500), nullable=False),
        sa.Column('district', sa.String(length=100), nullable=False),
        sa.Column('state', sa.String(length=100), nullable=False, server_default='Karnataka'),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('business_name', sa.String(length=255), nullable=False),
        sa.Column('experience_years', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('languages', sa.String(length=255), nullable=True),
        sa.Column('id_type', sa.String(length=50), nullable=False),
        sa.Column('id_number', sa.String(length=100), nullable=False),
        sa.Column('document_url', sa.String(length=500), nullable=True),
        sa.Column('services_json', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('activities_json', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('reviewed_by', GUID(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_partner_applications_code', 'partner_applications', ['application_code'], unique=True)
    op.create_index('ix_partner_applications_user_id', 'partner_applications', ['user_id'])
    op.create_index('ix_partner_applications_role_type', 'partner_applications', ['role_type'])
    op.create_index('ix_partner_applications_status', 'partner_applications', ['status'])
    op.create_index('ix_partner_applications_district', 'partner_applications', ['district'])
    op.create_index('idx_partner_app_user_status', 'partner_applications', ['user_id', 'status'])


def downgrade():
    op.drop_table('partner_applications')
