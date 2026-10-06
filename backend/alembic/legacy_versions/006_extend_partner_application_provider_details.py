"""Extend partner_applications with provider_details, documents, images, and draft_step columns.

Revision ID: f9e8d7c65432
Revises: e8f190a12345
Create Date: 2026-09-10 00:33:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f3a7c1e9b2d4'
down_revision = '1b8c4d9e2f0a'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('partner_applications', sa.Column('provider_details_json', sa.Text(), nullable=True, server_default='{}'))
    op.add_column('partner_applications', sa.Column('documents_json', sa.Text(), nullable=True, server_default='[]'))
    op.add_column('partner_applications', sa.Column('images_json', sa.Text(), nullable=True, server_default='[]'))
    op.add_column('partner_applications', sa.Column('draft_step', sa.Integer(), nullable=True, server_default='1'))


def downgrade():
    op.drop_column('partner_applications', 'draft_step')
    op.drop_column('partner_applications', 'images_json')
    op.drop_column('partner_applications', 'documents_json')
    op.drop_column('partner_applications', 'provider_details_json')
