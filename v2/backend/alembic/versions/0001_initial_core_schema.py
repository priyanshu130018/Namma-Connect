"""Initial core schema migration for NammaConnect V2.

Revision ID: 0001_initial_core_schema
Revises: 
Create Date: 2026-08-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from app.models.base import GUID

# revision identifiers, used by Alembic.
revision = '0001_initial_core_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ── 1. users table ──
    op.create_table(
        'users',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=True),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('mobile', sa.String(length=32), nullable=True),
        sa.Column('role', sa.String(length=32), nullable=False, server_default='customer'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('phone_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('auth_provider', sa.String(length=32), nullable=False, server_default='local'),
        sa.Column('google_id', sa.String(length=255), nullable=True),
        sa.Column('avatar_url', sa.String(length=512), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=True, server_default='Bengaluru, Karnataka'),
        sa.Column('language', sa.String(length=64), nullable=False, server_default='English, Kannada'),
        sa.Column('theme_preference', sa.String(length=32), nullable=False, server_default='system'),
        sa.Column('notification_preferences', sa.String(length=1024), nullable=True, server_default='{"email": true, "sms": true, "promo": false, "bookings": true, "payments": true, "collaborations": true, "support": true}'),
        sa.Column('privacy_preferences', sa.String(length=512), nullable=True, server_default='{"share_profile": true, "personalize_location": true}'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_mobile', 'users', ['mobile'], unique=True)
    op.create_index('ix_users_role', 'users', ['role'])
    op.create_index('ix_users_google_id', 'users', ['google_id'], unique=True)

    # ── 2. services table ──
    op.create_table(
        'services',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('category_slug', sa.String(length=100), nullable=False),
        sa.Column('location', sa.String(length=255), nullable=False),
        sa.Column('district', sa.String(length=100), nullable=False),
        sa.Column('state', sa.String(length=100), nullable=False, server_default='Karnataka'),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(length=50), nullable=False, server_default='night'),
        sa.Column('duration_hours', sa.Float(), nullable=True),
        sa.Column('max_capacity', sa.Integer(), nullable=True, server_default='10'),
        sa.Column('rating', sa.Float(), nullable=False, server_default='5.0'),
        sa.Column('reviews_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PUBLISHED'),
        sa.Column('provider_id', GUID(), nullable=True),
        sa.Column('provider_name', sa.String(length=255), nullable=False),
        sa.Column('provider_type', sa.String(length=100), nullable=False, server_default='Farmer'),
        sa.Column('provider_avatar', sa.String(length=500), nullable=True),
        sa.Column('primary_image', sa.String(length=500), nullable=False),
        sa.Column('images_json', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('inclusions_json', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('amenities_json', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_services_title', 'services', ['title'])
    op.create_index('ix_services_slug', 'services', ['slug'], unique=True)
    op.create_index('ix_services_category', 'services', ['category'])
    op.create_index('ix_services_category_slug', 'services', ['category_slug'])
    op.create_index('ix_services_location', 'services', ['location'])
    op.create_index('ix_services_district', 'services', ['district'])
    op.create_index('ix_services_status', 'services', ['status'])
    op.create_index('ix_services_provider_id', 'services', ['provider_id'])
    op.create_index('idx_service_search', 'services', ['category_slug', 'status', 'price'])

    # ── 3. bookings table ──
    op.create_table(
        'bookings',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('booking_code', sa.String(length=32), nullable=False),
        sa.Column('customer_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_id', GUID(), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider_id', GUID(), nullable=True),
        sa.Column('start_date', sa.String(length=32), nullable=False),
        sa.Column('end_date', sa.String(length=32), nullable=True),
        sa.Column('time_slot_id', sa.String(length=64), nullable=True),
        sa.Column('time_slot_label', sa.String(length=128), nullable=True),
        sa.Column('guest_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='PENDING'),
        sa.Column('unit_price', sa.Float(), nullable=False),
        sa.Column('total_amount', sa.Float(), nullable=False),
        sa.Column('special_requests', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_bookings_booking_code', 'bookings', ['booking_code'], unique=True)
    op.create_index('ix_bookings_customer_id', 'bookings', ['customer_id'])
    op.create_index('ix_bookings_service_id', 'bookings', ['service_id'])
    op.create_index('ix_bookings_provider_id', 'bookings', ['provider_id'])
    op.create_index('ix_bookings_status', 'bookings', ['status'])
    op.create_index('idx_customer_bookings', 'bookings', ['customer_id', 'status', 'created_at'])

    # ── 4. reviews table ──
    op.create_table(
        'reviews',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('service_id', GUID(), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=False),
        sa.Column('booking_id', GUID(), sa.ForeignKey('bookings.id', ondelete='SET NULL'), nullable=True),
        sa.Column('user_id', GUID(), nullable=True),
        sa.Column('user_name', sa.String(length=255), nullable=False),
        sa.Column('rating', sa.Float(), nullable=False, server_default='5.0'),
        sa.Column('comment', sa.Text(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PUBLISHED'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_reviews_service_id', 'reviews', ['service_id'])
    op.create_index('ix_reviews_booking_id', 'reviews', ['booking_id'], unique=True)
    op.create_index('ix_reviews_user_id', 'reviews', ['user_id'])

    # ── 5. payments table ──
    op.create_table(
        'payments',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('booking_id', GUID(), sa.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('customer_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('razorpay_order_id', sa.String(length=128), nullable=False),
        sa.Column('razorpay_payment_id', sa.String(length=128), nullable=True),
        sa.Column('razorpay_signature', sa.String(length=256), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='PENDING'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_payments_booking_id', 'payments', ['booking_id'])
    op.create_index('ix_payments_customer_id', 'payments', ['customer_id'])
    op.create_index('ix_payments_razorpay_order_id', 'payments', ['razorpay_order_id'])
    op.create_index('ix_payments_razorpay_payment_id', 'payments', ['razorpay_payment_id'])
    op.create_index('ix_payments_status', 'payments', ['status'])
    op.create_index('idx_booking_payments', 'payments', ['booking_id', 'status'])
    op.create_index('idx_customer_payments', 'payments', ['customer_id', 'status'])

    # ── 6. payouts table ──
    op.create_table(
        'payouts',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('payout_code', sa.String(length=64), nullable=False),
        sa.Column('provider_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='PENDING'),
        sa.Column('beneficiary_name', sa.String(length=255), nullable=True),
        sa.Column('bank_account_last4', sa.String(length=10), nullable=True),
        sa.Column('ifsc_code', sa.String(length=32), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_payouts_payout_code', 'payouts', ['payout_code'], unique=True)
    op.create_index('ix_payouts_provider_id', 'payouts', ['provider_id'])
    op.create_index('ix_payouts_status', 'payouts', ['status'])
    op.create_index('idx_provider_payouts_status', 'payouts', ['provider_id', 'status'])

    # ── 7. refunds table ──
    op.create_table(
        'refunds',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('refund_code', sa.String(length=64), nullable=False),
        sa.Column('payment_id', GUID(), sa.ForeignKey('payments.id', ondelete='CASCADE'), nullable=True),
        sa.Column('booking_id', GUID(), sa.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('customer_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='PENDING'),
        sa.Column('razorpay_refund_id', sa.String(length=128), nullable=True),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('failure_reason', sa.String(length=255), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_refunds_refund_code', 'refunds', ['refund_code'], unique=True)
    op.create_index('ix_refunds_payment_id', 'refunds', ['payment_id'])
    op.create_index('ix_refunds_booking_id', 'refunds', ['booking_id'])
    op.create_index('ix_refunds_customer_id', 'refunds', ['customer_id'])
    op.create_index('ix_refunds_status', 'refunds', ['status'])
    op.create_index('ix_refunds_razorpay_refund_id', 'refunds', ['razorpay_refund_id'])
    op.create_index('idx_booking_refunds', 'refunds', ['booking_id', 'status'])
    op.create_index('idx_customer_refunds', 'refunds', ['customer_id', 'status'])

    # ── 8. creator_profiles table ──
    op.create_table(
        'creator_profiles',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=False),
        sa.Column('handle', sa.String(length=100), nullable=False),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('bio', sa.Text(), nullable=False),
        sa.Column('location', sa.String(length=255), nullable=False),
        sa.Column('reach', sa.String(length=100), nullable=False, server_default='50K+ Reach'),
        sa.Column('starting_rate', sa.Float(), nullable=False, server_default='10000.0'),
        sa.Column('rating', sa.Float(), nullable=False, server_default='5.0'),
        sa.Column('reviews_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('specialties_json', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('social_links_json', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('portfolio_items_json', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('packages_json', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_creator_profiles_user_id', 'creator_profiles', ['user_id'], unique=True)
    op.create_index('ix_creator_profiles_handle', 'creator_profiles', ['handle'], unique=True)
    op.create_index('idx_creator_handle', 'creator_profiles', ['handle'])
    op.create_index('idx_creator_verified', 'creator_profiles', ['is_verified'])

    # ── 9. collaborations table ──
    op.create_table(
        'collaborations',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('collaboration_code', sa.String(length=50), nullable=False),
        sa.Column('creator_id', GUID(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('creator_name', sa.String(length=255), nullable=False),
        sa.Column('creator_handle', sa.String(length=100), nullable=False),
        sa.Column('partner_id', GUID(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('partner_name', sa.String(length=255), nullable=False),
        sa.Column('campaign_title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('proposed_dates', sa.String(length=100), nullable=False),
        sa.Column('budget', sa.Float(), nullable=False),
        sa.Column('deliverables_json', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_collaborations_collaboration_code', 'collaborations', ['collaboration_code'], unique=True)
    op.create_index('ix_collaborations_creator_id', 'collaborations', ['creator_id'])
    op.create_index('ix_collaborations_partner_id', 'collaborations', ['partner_id'])
    op.create_index('ix_collaborations_status', 'collaborations', ['status'])
    op.create_index('idx_collab_creator_status', 'collaborations', ['creator_id', 'status'])
    op.create_index('idx_collab_partner_status', 'collaborations', ['partner_id', 'status'])

    # ── 10. notifications table ──
    op.create_table(
        'notifications',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False, server_default='system'),
        sa.Column('resource_type', sa.String(length=50), nullable=True),
        sa.Column('resource_id', sa.String(length=255), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])
    op.create_index('idx_notification_user_read', 'notifications', ['user_id', 'is_read'])
    op.create_index('idx_notification_user_created', 'notifications', ['user_id', 'created_at'])

    # ── 11. conversations table ──
    op.create_table(
        'conversations',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('participant1_id', GUID(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('participant1_name', sa.String(length=255), nullable=False),
        sa.Column('participant2_id', GUID(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('participant2_name', sa.String(length=255), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=True),
        sa.Column('last_message_text', sa.Text(), nullable=True),
        sa.Column('last_message_at', sa.DateTime(), nullable=False),
        sa.Column('unread_count_p1', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('unread_count_p2', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_conversations_participant1_id', 'conversations', ['participant1_id'])
    op.create_index('ix_conversations_participant2_id', 'conversations', ['participant2_id'])
    op.create_index('ix_conversations_last_message_at', 'conversations', ['last_message_at'])
    op.create_index('idx_conversation_p1_p2', 'conversations', ['participant1_id', 'participant2_id'])

    # ── 12. messages table ──
    op.create_table(
        'messages',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('conversation_id', GUID(), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender_id', GUID(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('sender_name', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'])
    op.create_index('ix_messages_sender_id', 'messages', ['sender_id'])
    op.create_index('idx_message_conv_created', 'messages', ['conversation_id', 'created_at'])

    # ── 13. support_tickets table ──
    op.create_table(
        'support_tickets',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('ticket_code', sa.String(length=50), nullable=False),
        sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_name', sa.String(length=255), nullable=False),
        sa.Column('user_email', sa.String(length=255), nullable=False),
        sa.Column('booking_id', sa.String(length=255), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='OPEN'),
        sa.Column('priority', sa.String(length=50), nullable=False, server_default='MEDIUM'),
        sa.Column('responses_json', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_support_tickets_ticket_code', 'support_tickets', ['ticket_code'], unique=True)
    op.create_index('ix_support_tickets_user_id', 'support_tickets', ['user_id'])
    op.create_index('ix_support_tickets_booking_id', 'support_tickets', ['booking_id'])
    op.create_index('ix_support_tickets_status', 'support_tickets', ['status'])
    op.create_index('idx_support_user_status', 'support_tickets', ['user_id', 'status'])
    op.create_index('idx_support_category', 'support_tickets', ['category'])

    # ── 14. saved_services table ──
    op.create_table(
        'saved_services',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_id', GUID(), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('user_id', 'service_id', name='uq_user_saved_service'),
    )
    op.create_index('ix_saved_services_user_id', 'saved_services', ['user_id'])
    op.create_index('ix_saved_services_service_id', 'saved_services', ['service_id'])
    op.create_index('idx_user_saved_services', 'saved_services', ['user_id', 'created_at'])


def downgrade():
    op.drop_table('saved_services')
    op.drop_table('support_tickets')
    op.drop_table('messages')
    op.drop_table('conversations')
    op.drop_table('notifications')
    op.drop_table('collaborations')
    op.drop_table('creator_profiles')
    op.drop_table('refunds')
    op.drop_table('payouts')
    op.drop_table('payments')
    op.drop_table('reviews')
    op.drop_table('bookings')
    op.drop_table('services')
    op.drop_table('users')
