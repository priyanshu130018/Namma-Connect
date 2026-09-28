"""Marketplace categories taxonomy, AI assistant, Trip planning, Services category link, and legacy creator removal.

Revision ID: 014_marketplace_ai_and_trip_planning
Revises: 013_user_profile_fields_and_notifications
Create Date: 2026-09-15
"""

import uuid
from alembic import op
import sqlalchemy as sa
from app.models.base import GUID


revision = '014_marketplace_ai_and_trip_planning'
down_revision = '013_user_profile_fields_and_notifications'
branch_labels = None
depends_on = None


# Exact 10 Permanent Reference Categories
SEEDED_CATEGORIES = [
    # ── 6 Activity Categories ──
    {
        "id": "c0000001-0000-0000-0000-000000000001",
        "slug": "farm",
        "name": "Farm Tours & Experiences",
        "marketplace_type": "ACTIVITY",
        "icon": "sprout",
        "description": "Hands-on agro-tours, harvest experiences, plantation walks, and rural life workshops.",
        "sort_order": 1,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000002",
        "slug": "adventure",
        "name": "Adventure & Trekking",
        "marketplace_type": "ACTIVITY",
        "icon": "mountain",
        "description": "Western Ghats peak trekking, coffee estate night camping, forest trails, and off-road expeditions.",
        "sort_order": 2,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000003",
        "slug": "water-sports",
        "name": "Water Sports & Activities",
        "marketplace_type": "ACTIVITY",
        "icon": "waves",
        "description": "Kayaking, river rafting, coracle rides, and coastal aquatic adventures.",
        "sort_order": 3,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000004",
        "slug": "wildlife",
        "name": "Wildlife Tours",
        "marketplace_type": "ACTIVITY",
        "icon": "paw-print",
        "description": "Guided jungle safaris, bird-watching trails, reptile walks, and sanctuary explorations.",
        "sort_order": 4,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000005",
        "slug": "food",
        "name": "Food Tours & Cooking",
        "marketplace_type": "ACTIVITY",
        "icon": "utensils",
        "description": "Authentic regional culinary walks, farm-to-table dining, and traditional cooking workshops.",
        "sort_order": 5,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000006",
        "slug": "cultural-historical",
        "name": "Cultural & Historical Tours",
        "marketplace_type": "ACTIVITY",
        "icon": "landmark",
        "description": "Ancient temple trails, traditional crafts, folklore performances, and heritage explorations.",
        "sort_order": 6,
    },
    # ── 4 Content Creator Categories ──
    {
        "id": "c0000001-0000-0000-0000-000000000007",
        "slug": "photography",
        "name": "Photography",
        "marketplace_type": "CONTENT_CREATOR",
        "icon": "camera",
        "description": "High-res estate, resort & farm photo shoots and portrait storytelling.",
        "sort_order": 7,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000008",
        "slug": "videography",
        "name": "Videography",
        "marketplace_type": "CONTENT_CREATOR",
        "icon": "video",
        "description": "Cinematic promotional films, brand documentaries, and storytelling productions.",
        "sort_order": 8,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000009",
        "slug": "drone-aerial",
        "name": "Drone & Aerial",
        "marketplace_type": "CONTENT_CREATOR",
        "icon": "navigation",
        "description": "4K aerial estate mapping, land elevation footage, and drone cinematography.",
        "sort_order": 9,
    },
    {
        "id": "c0000001-0000-0000-0000-000000000010",
        "slug": "travel-reels",
        "name": "Travel Reels",
        "marketplace_type": "CONTENT_CREATOR",
        "icon": "sparkles",
        "description": "Short-form social media video packages, Instagram reels, and viral creator storytelling.",
        "sort_order": 10,
    },
]


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # ── 1. Create marketplace_categories table ──
    if 'marketplace_categories' not in existing_tables:
        op.create_table(
            'marketplace_categories',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('marketplace_type', sa.String(length=50), nullable=False),
            sa.Column('slug', sa.String(length=100), nullable=False),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('icon', sa.String(length=100), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        )
        op.create_index('ix_marketplace_categories_slug', 'marketplace_categories', ['slug'], unique=True)
        op.create_index('ix_marketplace_categories_type', 'marketplace_categories', ['marketplace_type'], unique=False)
        op.create_index('ix_marketplace_categories_is_active', 'marketplace_categories', ['is_active'], unique=False)

    # Seed the 10 permanent reference categories
    for cat in SEEDED_CATEGORIES:
        conn.execute(
            sa.text(
                """
                INSERT INTO marketplace_categories (id, marketplace_type, slug, name, icon, description, sort_order, is_active, created_at, updated_at)
                VALUES (:id, :marketplace_type, :slug, :name, :icon, :description, :sort_order, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (slug) DO UPDATE SET
                    name = EXCLUDED.name,
                    marketplace_type = EXCLUDED.marketplace_type,
                    icon = EXCLUDED.icon,
                    description = EXCLUDED.description,
                    sort_order = EXCLUDED.sort_order,
                    updated_at = CURRENT_TIMESTAMP;
                """
            ),
            cat,
        )

    # ── 2. Update services table: category_id & marketplace_type ──
    if 'services' in existing_tables:
        service_columns = [col['name'] for col in inspector.get_columns('services')]
        if 'category_id' not in service_columns:
            op.add_column(
                'services',
                sa.Column('category_id', GUID(), sa.ForeignKey('marketplace_categories.id', ondelete='SET NULL'), nullable=True),
            )
            op.create_index('ix_services_category_id', 'services', ['category_id'], unique=False)
        if 'marketplace_type' not in service_columns:
            op.add_column(
                'services',
                sa.Column('marketplace_type', sa.String(length=50), nullable=False, server_default='ACTIVITY'),
            )
            op.create_index('ix_services_marketplace_type', 'services', ['marketplace_type'], unique=False)

        # Backfill category_id and marketplace_type based on existing category_slug
        conn.execute(
            sa.text(
                """
                UPDATE services s
                SET category_id = mc.id,
                    marketplace_type = mc.marketplace_type
                FROM marketplace_categories mc
                WHERE s.category_slug = mc.slug
                   OR (s.category_slug IN ('photography', 'videography', 'drone-aerial', 'travel-reels', 'content-creator')
                       AND mc.marketplace_type = 'CONTENT_CREATOR' AND s.category_slug = mc.slug);
                """
            )
        )

    # ── 3. Update Recommendation & User Interaction tables ──
    if 'user_interactions' in existing_tables:
        ui_cols = [col['name'] for col in inspector.get_columns('user_interactions')]
        if 'provider_id' not in ui_cols:
            op.add_column('user_interactions', sa.Column('provider_id', GUID(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
            op.create_index('ix_user_interactions_provider_id', 'user_interactions', ['provider_id'], unique=False)
        if 'category_id' not in ui_cols:
            op.add_column('user_interactions', sa.Column('category_id', GUID(), sa.ForeignKey('marketplace_categories.id', ondelete='SET NULL'), nullable=True))
            op.create_index('ix_user_interactions_category_id', 'user_interactions', ['category_id'], unique=False)
        if 'event_value' not in ui_cols:
            op.add_column('user_interactions', sa.Column('event_value', sa.String(length=255), nullable=True))
        if 'duration_seconds' not in ui_cols:
            op.add_column('user_interactions', sa.Column('duration_seconds', sa.Integer(), nullable=True))
        if 'session_id' not in ui_cols:
            op.add_column('user_interactions', sa.Column('session_id', sa.String(length=128), nullable=True))
        if 'source' not in ui_cols:
            op.add_column('user_interactions', sa.Column('source', sa.String(length=64), nullable=True))

    if 'user_interest_profiles' in existing_tables:
        uip_cols = [col['name'] for col in inspector.get_columns('user_interest_profiles')]
        if 'category_id' not in uip_cols:
            op.add_column('user_interest_profiles', sa.Column('category_id', GUID(), sa.ForeignKey('marketplace_categories.id', ondelete='SET NULL'), nullable=True))
            op.create_index('ix_user_interest_profiles_category_id', 'user_interest_profiles', ['category_id'], unique=False)
        if 'interest_score' not in uip_cols:
            op.add_column('user_interest_profiles', sa.Column('interest_score', sa.Float(), nullable=False, server_default='0.0'))
        if 'confidence_score' not in uip_cols:
            op.add_column('user_interest_profiles', sa.Column('confidence_score', sa.Float(), nullable=False, server_default='0.0'))
        if 'interaction_count' not in uip_cols:
            op.add_column('user_interest_profiles', sa.Column('interaction_count', sa.Integer(), nullable=False, server_default='0'))
        if 'last_interaction_at' not in uip_cols:
            op.add_column('user_interest_profiles', sa.Column('last_interaction_at', sa.DateTime(), nullable=True))

    if 'recommendation_results' in existing_tables:
        rr_cols = [col['name'] for col in inspector.get_columns('recommendation_results')]
        if 'provider_id' not in rr_cols:
            op.add_column('recommendation_results', sa.Column('provider_id', GUID(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
            op.create_index('ix_recommendation_results_provider_id', 'recommendation_results', ['provider_id'], unique=False)
        if 'category_id' not in rr_cols:
            op.add_column('recommendation_results', sa.Column('category_id', GUID(), sa.ForeignKey('marketplace_categories.id', ondelete='SET NULL'), nullable=True))
            op.create_index('ix_recommendation_results_category_id', 'recommendation_results', ['category_id'], unique=False)
        if 'recommendation_type' not in rr_cols:
            op.add_column('recommendation_results', sa.Column('recommendation_type', sa.String(length=64), nullable=False, server_default='PERSONALIZED'))
        if 'rank' not in rr_cols:
            op.add_column('recommendation_results', sa.Column('rank', sa.Integer(), nullable=True))
        if 'reason' not in rr_cols:
            op.add_column('recommendation_results', sa.Column('reason', sa.String(length=255), nullable=True))
        if 'expires_at' not in rr_cols:
            op.add_column('recommendation_results', sa.Column('expires_at', sa.DateTime(), nullable=True))
            op.create_index('ix_recommendation_results_expires_at', 'recommendation_results', ['expires_at'], unique=False)

    if 'recommendation_impressions' in existing_tables:
        ri_cols = [col['name'] for col in inspector.get_columns('recommendation_impressions')]
        if 'recommendation_id' not in ri_cols:
            op.add_column('recommendation_impressions', sa.Column('recommendation_id', GUID(), sa.ForeignKey('recommendation_results.id', ondelete='SET NULL'), nullable=True))
        if 'surface' not in ri_cols:
            op.add_column('recommendation_impressions', sa.Column('surface', sa.String(length=64), nullable=False, server_default='HOME'))
        if 'shown_at' not in ri_cols:
            op.add_column('recommendation_impressions', sa.Column('shown_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')))
        if 'clicked_at' not in ri_cols:
            op.add_column('recommendation_impressions', sa.Column('clicked_at', sa.DateTime(), nullable=True))
        if 'viewed_at' not in ri_cols:
            op.add_column('recommendation_impressions', sa.Column('viewed_at', sa.DateTime(), nullable=True))
        if 'saved_at' not in ri_cols:
            op.add_column('recommendation_impressions', sa.Column('saved_at', sa.DateTime(), nullable=True))
        if 'booked_at' not in ri_cols:
            op.add_column('recommendation_impressions', sa.Column('booked_at', sa.DateTime(), nullable=True))

    if 'recommendation_feedback' in existing_tables:
        rf_cols = [col['name'] for col in inspector.get_columns('recommendation_feedback')]
        if 'recommendation_id' not in rf_cols:
            op.add_column('recommendation_feedback', sa.Column('recommendation_id', GUID(), sa.ForeignKey('recommendation_results.id', ondelete='SET NULL'), nullable=True))
        if 'feedback_text' not in rf_cols:
            op.add_column('recommendation_feedback', sa.Column('feedback_text', sa.Text(), nullable=True))

    # ── 4. Update Provider Analytics tables ──
    if 'provider_daily_metrics' in existing_tables:
        pdm_cols = [col['name'] for col in inspector.get_columns('provider_daily_metrics')]
        if 'clicks' not in pdm_cols:
            op.add_column('provider_daily_metrics', sa.Column('clicks', sa.Integer(), nullable=False, server_default='0'))
        if 'bookings' not in pdm_cols:
            op.add_column('provider_daily_metrics', sa.Column('bookings', sa.Integer(), nullable=False, server_default='0'))
        if 'revenue' not in pdm_cols:
            op.add_column('provider_daily_metrics', sa.Column('revenue', sa.Float(), nullable=False, server_default='0.0'))
        if 'available_slots' not in pdm_cols:
            op.add_column('provider_daily_metrics', sa.Column('available_slots', sa.Integer(), nullable=False, server_default='0'))
        if 'booked_slots' not in pdm_cols:
            op.add_column('provider_daily_metrics', sa.Column('booked_slots', sa.Integer(), nullable=False, server_default='0'))
        if 'conversion_rate' not in pdm_cols:
            op.add_column('provider_daily_metrics', sa.Column('conversion_rate', sa.Float(), nullable=False, server_default='0.0'))
        if 'occupancy_rate' not in pdm_cols:
            op.add_column('provider_daily_metrics', sa.Column('occupancy_rate', sa.Float(), nullable=False, server_default='0.0'))

    if 'service_daily_metrics' in existing_tables:
        sdm_cols = [col['name'] for col in inspector.get_columns('service_daily_metrics')]
        if 'clicks' not in sdm_cols:
            op.add_column('service_daily_metrics', sa.Column('clicks', sa.Integer(), nullable=False, server_default='0'))
        if 'bookings' not in sdm_cols:
            op.add_column('service_daily_metrics', sa.Column('bookings', sa.Integer(), nullable=False, server_default='0'))
        if 'revenue' not in sdm_cols:
            op.add_column('service_daily_metrics', sa.Column('revenue', sa.Float(), nullable=False, server_default='0.0'))
        if 'capacity' not in sdm_cols:
            op.add_column('service_daily_metrics', sa.Column('capacity', sa.Integer(), nullable=False, server_default='0'))
        if 'booked_slots' not in sdm_cols:
            op.add_column('service_daily_metrics', sa.Column('booked_slots', sa.Integer(), nullable=False, server_default='0'))
        if 'conversion_rate' not in sdm_cols:
            op.add_column('service_daily_metrics', sa.Column('conversion_rate', sa.Float(), nullable=False, server_default='0.0'))
        if 'occupancy_rate' not in sdm_cols:
            op.add_column('service_daily_metrics', sa.Column('occupancy_rate', sa.Float(), nullable=False, server_default='0.0'))

    if 'provider_response_metrics' in existing_tables:
        prm_cols = [col['name'] for col in inspector.get_columns('provider_response_metrics')]
        if 'requests_received' not in prm_cols:
            op.add_column('provider_response_metrics', sa.Column('requests_received', sa.Integer(), nullable=False, server_default='0'))
        if 'requests_responded' not in prm_cols:
            op.add_column('provider_response_metrics', sa.Column('requests_responded', sa.Integer(), nullable=False, server_default='0'))
        if 'average_response_seconds' not in prm_cols:
            op.add_column('provider_response_metrics', sa.Column('average_response_seconds', sa.Float(), nullable=False, server_default='0.0'))
        if 'confirmation_rate' not in prm_cols:
            op.add_column('provider_response_metrics', sa.Column('confirmation_rate', sa.Float(), nullable=False, server_default='0.0'))
        if 'cancellation_rate' not in prm_cols:
            op.add_column('provider_response_metrics', sa.Column('cancellation_rate', sa.Float(), nullable=False, server_default='0.0'))

    if 'provider_action_recommendations' in existing_tables:
        par_cols = [col['name'] for col in inspector.get_columns('provider_action_recommendations')]
        if 'recommendation_type' not in par_cols:
            op.add_column('provider_action_recommendations', sa.Column('recommendation_type', sa.String(length=64), nullable=True))
        if 'priority' not in par_cols:
            op.add_column('provider_action_recommendations', sa.Column('priority', sa.String(length=32), nullable=False, server_default='MEDIUM'))
        if 'message' not in par_cols:
            op.add_column('provider_action_recommendations', sa.Column('message', sa.Text(), nullable=True))
        if 'metric_value' not in par_cols:
            op.add_column('provider_action_recommendations', sa.Column('metric_value', sa.Float(), nullable=True))
        if 'threshold_value' not in par_cols:
            op.add_column('provider_action_recommendations', sa.Column('threshold_value', sa.Float(), nullable=True))
        if 'status' not in par_cols:
            op.add_column('provider_action_recommendations', sa.Column('status', sa.String(length=32), nullable=False, server_default='PENDING'))
        if 'expires_at' not in par_cols:
            op.add_column('provider_action_recommendations', sa.Column('expires_at', sa.DateTime(), nullable=True))

    # ── 5. Create AI Assistant Tables: ai_conversations & ai_messages ──
    if 'ai_conversations' not in existing_tables:
        op.create_table(
            'ai_conversations',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
            sa.Column('title', sa.String(length=255), nullable=False, server_default='New Conversation'),
            sa.Column('context_type', sa.String(length=50), nullable=False, server_default='TRAVEL'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        )
        op.create_index('ix_ai_conversations_user_id', 'ai_conversations', ['user_id'], unique=False)
        op.create_index('idx_ai_conv_user_updated', 'ai_conversations', ['user_id', 'updated_at'], unique=False)

    if 'ai_messages' not in existing_tables:
        op.create_table(
            'ai_messages',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('conversation_id', GUID(), sa.ForeignKey('ai_conversations.id', ondelete='CASCADE'), nullable=False),
            sa.Column('role', sa.String(length=32), nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('intent', sa.String(length=64), nullable=True),
            sa.Column('metadata_json', sa.Text(), nullable=False, server_default='{}'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        )
        op.create_index('ix_ai_messages_conversation_id', 'ai_messages', ['conversation_id'], unique=False)
        op.create_index('idx_ai_msg_conv_created', 'ai_messages', ['conversation_id', 'created_at'], unique=False)

    # ── 6. Create Trip Planning Tables: trips, trip_days, trip_items, ai_trip_plans ──
    if 'trips' not in existing_tables:
        op.create_table(
            'trips',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('start_date', sa.String(length=32), nullable=True),
            sa.Column('end_date', sa.String(length=32), nullable=True),
            sa.Column('origin', sa.String(length=255), nullable=True),
            sa.Column('destination', sa.String(length=255), nullable=False),
            sa.Column('status', sa.String(length=32), nullable=False, server_default='DRAFT'),
            sa.Column('created_by', sa.String(length=32), nullable=False, server_default='USER'),
            sa.Column('ai_generated', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        )
        op.create_index('ix_trips_user_id', 'trips', ['user_id'], unique=False)
        op.create_index('ix_trips_status', 'trips', ['status'], unique=False)
        op.create_index('idx_trips_user_start', 'trips', ['user_id', 'start_date'], unique=False)

    if 'trip_days' not in existing_tables:
        op.create_table(
            'trip_days',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('trip_id', GUID(), sa.ForeignKey('trips.id', ondelete='CASCADE'), nullable=False),
            sa.Column('day_number', sa.Integer(), nullable=False),
            sa.Column('date', sa.String(length=32), nullable=True),
            sa.Column('title', sa.String(length=255), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        )
        op.create_index('ix_trip_days_trip_id', 'trip_days', ['trip_id'], unique=False)
        op.create_index('idx_trip_days_trip_day', 'trip_days', ['trip_id', 'day_number'], unique=False)

    if 'trip_items' not in existing_tables:
        op.create_table(
            'trip_items',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('trip_day_id', GUID(), sa.ForeignKey('trip_days.id', ondelete='CASCADE'), nullable=False),
            sa.Column('service_id', GUID(), sa.ForeignKey('services.id', ondelete='SET NULL'), nullable=True),
            sa.Column('provider_id', GUID(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('booking_id', GUID(), sa.ForeignKey('bookings.id', ondelete='SET NULL'), nullable=True),
            sa.Column('item_type', sa.String(length=50), nullable=False, server_default='SERVICE'),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('start_time', sa.String(length=32), nullable=True),
            sa.Column('end_time', sa.String(length=32), nullable=True),
            sa.Column('duration_minutes', sa.Integer(), nullable=True),
            sa.Column('sequence_order', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('is_booked', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        )
        op.create_index('ix_trip_items_trip_day_id', 'trip_items', ['trip_day_id'], unique=False)
        op.create_index('ix_trip_items_service_id', 'trip_items', ['service_id'], unique=False)
        op.create_index('idx_trip_items_day_seq', 'trip_items', ['trip_day_id', 'sequence_order'], unique=False)

    if 'ai_trip_plans' not in existing_tables:
        op.create_table(
            'ai_trip_plans',
            sa.Column('id', GUID(), primary_key=True),
            sa.Column('trip_id', GUID(), sa.ForeignKey('trips.id', ondelete='SET NULL'), nullable=True),
            sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('prompt', sa.Text(), nullable=False),
            sa.Column('preferences_json', sa.Text(), nullable=False, server_default='{}'),
            sa.Column('constraints_json', sa.Text(), nullable=False, server_default='{}'),
            sa.Column('model', sa.String(length=128), nullable=False, server_default='gemini-3.5-flash-lite'),
            sa.Column('model_version', sa.String(length=64), nullable=False, server_default='v2.0.0'),
            sa.Column('status', sa.String(length=32), nullable=False, server_default='COMPLETED'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('completed_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_ai_trip_plans_user_id', 'ai_trip_plans', ['user_id'], unique=False)
        op.create_index('ix_ai_trip_plans_trip_id', 'ai_trip_plans', ['trip_id'], unique=False)
        op.create_index('idx_ai_trip_plans_user_created', 'ai_trip_plans', ['user_id', 'created_at'], unique=False)

    # ── 7. Safely drop legacy creator_profiles and collaborations tables ──
    if 'collaborations' in existing_tables:
        op.drop_table('collaborations')
    if 'creator_profiles' in existing_tables:
        op.drop_table('creator_profiles')


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # Recreate legacy creator tables if needed
    if 'creator_profiles' not in existing_tables:
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

    if 'collaborations' not in existing_tables:
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

    if 'ai_trip_plans' in existing_tables:
        op.drop_table('ai_trip_plans')
    if 'trip_items' in existing_tables:
        op.drop_table('trip_items')
    if 'trip_days' in existing_tables:
        op.drop_table('trip_days')
    if 'trips' in existing_tables:
        op.drop_table('trips')
    if 'ai_messages' in existing_tables:
        op.drop_table('ai_messages')
    if 'ai_conversations' in existing_tables:
        op.drop_table('ai_conversations')
    if 'services' in existing_tables:
        service_cols = [c['name'] for c in inspector.get_columns('services')]
        if 'category_id' in service_cols:
            op.drop_index('ix_services_category_id', table_name='services')
            op.drop_column('services', 'category_id')
        if 'marketplace_type' in service_cols:
            op.drop_index('ix_services_marketplace_type', table_name='services')
            op.drop_column('services', 'marketplace_type')
    if 'marketplace_categories' in existing_tables:
        op.drop_table('marketplace_categories')
