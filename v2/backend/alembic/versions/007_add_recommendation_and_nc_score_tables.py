"""Add recommendation, user interest profiles, NC Score, and provider analytics tables.

Revision ID: a9b8c7d6e5f4
Revises: f3a7c1e9b2d4
Create Date: 2026-09-10 23:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from app.models.base import GUID

# revision identifiers, used by Alembic.
revision = 'a9b8c7d6e5f4'
down_revision = 'f3a7c1e9b2d4'
branch_labels = None
depends_on = None


def upgrade():
    # 1. user_interactions
    op.create_table(
        'user_interactions',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_id', GUID(), sa.ForeignKey('services.id', ondelete='SET NULL'), nullable=True),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('weight', sa.Float(), nullable=False, server_default='0.10'),
        sa.Column('metadata_json', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_user_interactions_user_id', 'user_interactions', ['user_id'])
    op.create_index('ix_user_interactions_service_id', 'user_interactions', ['service_id'])
    op.create_index('ix_user_interactions_event_type', 'user_interactions', ['event_type'])
    op.create_index('ix_user_interactions_is_test_data', 'user_interactions', ['is_test_data'])
    op.create_index('idx_user_interaction_event', 'user_interactions', ['user_id', 'event_type', 'created_at'])
    op.create_index('idx_user_interaction_service', 'user_interactions', ['user_id', 'service_id', 'created_at'])

    # 2. user_interest_profiles
    op.create_table(
        'user_interest_profiles',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category_affinity_json', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('destination_affinity_json', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('topic_affinity_json', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('budget_band_json', sa.Text(), nullable=False, server_default='{"min": 500, "max": 10000}'),
        sa.Column('language', sa.String(length=64), nullable=False, server_default='en'),
        sa.Column('last_updated', sa.DateTime(), nullable=False),
        sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('user_id', name='uq_user_interest_profile_user_id'),
    )
    op.create_index('ix_user_interest_profiles_user_id', 'user_interest_profiles', ['user_id'])

    # 3. user_similarities
    op.create_table(
        'user_similarities',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('user_id_1', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id_2', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('similarity_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('evidence_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('user_id_1', 'user_id_2', name='uq_user_similarity_pair'),
    )
    op.create_index('ix_user_similarities_user1', 'user_similarities', ['user_id_1'])
    op.create_index('ix_user_similarities_user2', 'user_similarities', ['user_id_2'])
    op.create_index('idx_user_sim_score', 'user_similarities', ['user_id_1', 'similarity_score'])

    # 4. recommendation_results
    op.create_table(
        'recommendation_results',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_id', GUID(), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=False),
        sa.Column('section', sa.String(length=64), nullable=False, server_default='recommended_for_you'),
        sa.Column('score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('reason_code', sa.String(length=128), nullable=False, server_default='personalized_match'),
        sa.Column('explanation_text', sa.Text(), nullable=False, server_default='Recommended based on your preferences.'),
        sa.Column('model_version', sa.String(length=64), nullable=False, server_default='v2.0.0'),
        sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_recommendation_results_user_id', 'recommendation_results', ['user_id'])
    op.create_index('ix_recommendation_results_service_id', 'recommendation_results', ['service_id'])
    op.create_index('idx_user_rec_section', 'recommendation_results', ['user_id', 'section', 'score'])

    # 5. recommendation_impressions
    op.create_table(
        'recommendation_impressions',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_id', GUID(), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=False),
        sa.Column('section', sa.String(length=64), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_recommendation_impressions_user_id', 'recommendation_impressions', ['user_id'])

    # 6. recommendation_feedback
    op.create_table(
        'recommendation_feedback',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_id', GUID(), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=False),
        sa.Column('feedback_type', sa.String(length=64), nullable=False),
        sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_recommendation_feedback_user_id', 'recommendation_feedback', ['user_id'])

    # 7. nc_score_snapshots
    op.create_table(
        'nc_score_snapshots',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('provider_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_id', GUID(), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=True),
        sa.Column('score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('component_json', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('model_version', sa.String(length=64), nullable=False, server_default='v2.0.0'),
        sa.Column('calculated_at', sa.DateTime(), nullable=False),
        sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_nc_score_snapshots_provider', 'nc_score_snapshots', ['provider_id'])

    # 8. provider_daily_metrics
    op.create_table(
        'provider_daily_metrics',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('provider_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.String(length=10), nullable=False),
        sa.Column('views', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('saves', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('booking_requests', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('accepted', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('cancelled', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('gross', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('net', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('rating_avg', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('provider_id', 'date', name='uq_provider_daily_metric_date'),
    )
    op.create_index('ix_provider_daily_metrics_provider', 'provider_daily_metrics', ['provider_id'])

    # 9. service_daily_metrics
    op.create_table(
        'service_daily_metrics',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('service_id', GUID(), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.String(length=10), nullable=False),
        sa.Column('views', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('saves', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('booking_requests', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('confirmed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('cancellations', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('rating_avg', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('service_id', 'date', name='uq_service_daily_metric_date'),
    )
    op.create_index('ix_service_daily_metrics_service', 'service_daily_metrics', ['service_id'])

    # 10. provider_response_metrics
    op.create_table(
        'provider_response_metrics',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('provider_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.String(length=10), nullable=False),
        sa.Column('pending_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('responded_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('avg_response_minutes', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('provider_id', 'date', name='uq_provider_response_metric_date'),
    )
    op.create_index('ix_provider_response_metrics_provider', 'provider_response_metrics', ['provider_id'])

    # 11. provider_action_recommendations
    op.create_table(
        'provider_action_recommendations',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('provider_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_id', GUID(), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=True),
        sa.Column('action_type', sa.String(length=64), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('evidence', sa.Text(), nullable=False),
        sa.Column('expected_impact', sa.Text(), nullable=False),
        sa.Column('action_text', sa.Text(), nullable=False),
        sa.Column('priority_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('model_version', sa.String(length=64), nullable=False, server_default='v2.0.0'),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_provider_action_recommendations_provider', 'provider_action_recommendations', ['provider_id'])
    op.create_index('idx_provider_action_priority', 'provider_action_recommendations', ['provider_id', 'priority_score'])


def downgrade():
    op.drop_table('provider_action_recommendations')
    op.drop_table('provider_response_metrics')
    op.drop_table('service_daily_metrics')
    op.drop_table('provider_daily_metrics')
    op.drop_table('nc_score_snapshots')
    op.drop_table('recommendation_feedback')
    op.drop_table('recommendation_impressions')
    op.drop_table('recommendation_results')
    op.drop_table('user_similarities')
    op.drop_table('user_interest_profiles')
    op.drop_table('user_interactions')
