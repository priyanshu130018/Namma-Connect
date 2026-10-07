"""Recommendation Domain Models (User Interactions, Affinity Profiles, Similarity, Results, Impressions, Feedback)."""

import uuid
from datetime import datetime
import sqlalchemy as sa
from app.models.base import Base, GUID, TimestampMixin
from app.core.enums import InteractionEventType, RecommendationType, RecommendationFeedbackType


class UserInteraction(Base, TimestampMixin):
    """Customer interaction signals used to derive personalization interest profiles."""

    __tablename__ = "user_interactions"

    id = sa.Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = sa.Column(GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = sa.Column(GUID(), sa.ForeignKey("services.id", ondelete="SET NULL"), nullable=True, index=True)
    provider_id = sa.Column(GUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    category_id = sa.Column(GUID(), sa.ForeignKey("marketplace_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = sa.Column(sa.String(64), nullable=False, index=True, default=InteractionEventType.VIEW.value)
    event_value = sa.Column(sa.String(255), nullable=True)
    duration_seconds = sa.Column(sa.Integer(), nullable=True)
    session_id = sa.Column(sa.String(128), nullable=True)
    source = sa.Column(sa.String(64), nullable=True)
    weight = sa.Column(sa.Float(), nullable=False, server_default="0.10")
    metadata_json = sa.Column(sa.Text(), nullable=False, server_default="{}")
    is_test_data = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True)
    is_synthetic = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True)

    __table_args__ = (
        sa.Index("idx_user_interaction_event", "user_id", "event_type", "created_at"),
        sa.Index("idx_user_interaction_service", "user_id", "service_id", "created_at"),
    )


class UserInterestProfile(Base, TimestampMixin):
    """Derived user interest profile capturing category affinities, scores, and confidence."""

    __tablename__ = "user_interest_profiles"

    id = sa.Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = sa.Column(GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    category_id = sa.Column(GUID(), sa.ForeignKey("marketplace_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    interest_score = sa.Column(sa.Float(), nullable=False, server_default="0.0")
    confidence_score = sa.Column(sa.Float(), nullable=False, server_default="0.0")
    interaction_count = sa.Column(sa.Integer(), nullable=False, server_default="0")
    last_interaction_at = sa.Column(sa.DateTime(), nullable=True)
    category_affinity_json = sa.Column(sa.Text(), nullable=False, server_default="{}")
    destination_affinity_json = sa.Column(sa.Text(), nullable=False, server_default="{}")
    topic_affinity_json = sa.Column(sa.Text(), nullable=False, server_default="{}")
    budget_band_json = sa.Column(sa.Text(), nullable=False, server_default='{"min": 500, "max": 10000}')
    language = sa.Column(sa.String(64), nullable=False, server_default="en")
    last_updated = sa.Column(sa.DateTime(), nullable=False, default=datetime.utcnow)
    is_test_data = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True)
    is_synthetic = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True)


class UserSimilarity(Base, TimestampMixin):
    """User-to-user behavioral similarity scores for collaborative filtering."""

    __tablename__ = "user_similarities"

    id = sa.Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id_1 = sa.Column(GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id_2 = sa.Column(GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    similarity_score = sa.Column(sa.Float(), nullable=False, server_default="0.0")
    evidence_count = sa.Column(sa.Integer(), nullable=False, server_default="0")
    is_test_data = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True)
    is_synthetic = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True)

    __table_args__ = (
        sa.UniqueConstraint("user_id_1", "user_id_2", name="uq_user_similarity_pair"),
        sa.Index("idx_user_sim_score", "user_id_1", "similarity_score"),
    )


class RecommendationResult(Base, TimestampMixin):
    """Precomputed personalized recommendation results."""

    __tablename__ = "recommendation_results"

    id = sa.Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = sa.Column(GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = sa.Column(GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id = sa.Column(GUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    category_id = sa.Column(GUID(), sa.ForeignKey("marketplace_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    recommendation_type = sa.Column(sa.String(64), nullable=False, server_default=RecommendationType.PERSONALIZED.value)
    section = sa.Column(sa.String(64), nullable=False, server_default="recommended_for_you", index=True)
    score = sa.Column(sa.Float(), nullable=False, server_default="0.0")
    rank = sa.Column(sa.Integer(), nullable=True)
    reason = sa.Column(sa.String(255), nullable=True)
    reason_code = sa.Column(sa.String(128), nullable=False, server_default="personalized_match")
    explanation_text = sa.Column(sa.Text(), nullable=False, server_default="Recommended based on your preferences.")
    model_version = sa.Column(sa.String(64), nullable=False, server_default="v2.0.0")
    expires_at = sa.Column(sa.DateTime(), nullable=True, index=True)
    is_test_data = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True)
    is_synthetic = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True)

    __table_args__ = (
        sa.Index("idx_user_rec_section", "user_id", "section", "score"),
    )


class RecommendationImpression(Base, TimestampMixin):
    """Tracked recommendation impressions on surfaces and sections."""

    __tablename__ = "recommendation_impressions"

    id = sa.Column(GUID(), primary_key=True, default=uuid.uuid4)
    recommendation_id = sa.Column(GUID(), sa.ForeignKey("recommendation_results.id", ondelete="SET NULL"), nullable=True)
    user_id = sa.Column(GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = sa.Column(GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    surface = sa.Column(sa.String(64), nullable=False, server_default="HOME")
    section = sa.Column(sa.String(64), nullable=False)
    position = sa.Column(sa.Integer(), nullable=False, server_default="0")
    shown_at = sa.Column(sa.DateTime(), nullable=True, default=datetime.utcnow)
    clicked_at = sa.Column(sa.DateTime(), nullable=True)
    viewed_at = sa.Column(sa.DateTime(), nullable=True)
    saved_at = sa.Column(sa.DateTime(), nullable=True)
    booked_at = sa.Column(sa.DateTime(), nullable=True)
    is_test_data = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"))
    is_synthetic = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"))


class RecommendationFeedback(Base, TimestampMixin):
    """Track explicit customer feedback on recommendations."""

    __tablename__ = "recommendation_feedback"

    id = sa.Column(GUID(), primary_key=True, default=uuid.uuid4)
    recommendation_id = sa.Column(GUID(), sa.ForeignKey("recommendation_results.id", ondelete="SET NULL"), nullable=True)
    user_id = sa.Column(GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = sa.Column(GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    feedback_type = sa.Column(sa.String(64), nullable=False, index=True, default=RecommendationFeedbackType.LIKE.value)
    feedback_text = sa.Column(sa.Text(), nullable=True)
    is_test_data = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"))
    is_synthetic = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"))
