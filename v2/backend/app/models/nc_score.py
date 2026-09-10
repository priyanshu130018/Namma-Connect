"""NC Score, Provider Analytics, and Provider Action Recommendation Models."""

from datetime import datetime
import sqlalchemy as sa
from app.models.base import Base, GUID, TimestampMixin


class NCScoreSnapshot(Base, TimestampMixin):
    """Historical NC Score snapshots for providers and services."""

    __tablename__ = "nc_score_snapshots"

    id = sa.Column(GUID(), primary_key=True)
    provider_id = sa.Column(GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = sa.Column(GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=True, index=True)
    score = sa.Column(sa.Float(), nullable=False, server_default="0.0")
    component_json = sa.Column(sa.Text(), nullable=False, server_default="{}")
    model_version = sa.Column(sa.String(64), nullable=False, server_default="v2.0.0")
    calculated_at = sa.Column(sa.DateTime(), nullable=False, default=datetime.utcnow, index=True)
    is_test_data = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"))


class ProviderDailyMetrics(Base, TimestampMixin):
    """Daily aggregated provider performance metrics."""

    __tablename__ = "provider_daily_metrics"

    id = sa.Column(GUID(), primary_key=True)
    provider_id = sa.Column(GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = sa.Column(sa.String(10), nullable=False, index=True)  # YYYY-MM-DD
    views = sa.Column(sa.Integer(), nullable=False, server_default="0")
    saves = sa.Column(sa.Integer(), nullable=False, server_default="0")
    booking_requests = sa.Column(sa.Integer(), nullable=False, server_default="0")
    accepted = sa.Column(sa.Integer(), nullable=False, server_default="0")
    cancelled = sa.Column(sa.Integer(), nullable=False, server_default="0")
    completed = sa.Column(sa.Integer(), nullable=False, server_default="0")
    gross = sa.Column(sa.Float(), nullable=False, server_default="0.0")
    net = sa.Column(sa.Float(), nullable=False, server_default="0.0")
    rating_avg = sa.Column(sa.Float(), nullable=False, server_default="0.0")
    is_test_data = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"))

    __table_args__ = (
        sa.UniqueConstraint("provider_id", "date", name="uq_provider_daily_metric_date"),
    )


class ServiceDailyMetrics(Base, TimestampMixin):
    """Daily aggregated service-level metrics."""

    __tablename__ = "service_daily_metrics"

    id = sa.Column(GUID(), primary_key=True)
    service_id = sa.Column(GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    date = sa.Column(sa.String(10), nullable=False, index=True)  # YYYY-MM-DD
    views = sa.Column(sa.Integer(), nullable=False, server_default="0")
    saves = sa.Column(sa.Integer(), nullable=False, server_default="0")
    booking_requests = sa.Column(sa.Integer(), nullable=False, server_default="0")
    confirmed = sa.Column(sa.Integer(), nullable=False, server_default="0")
    completed = sa.Column(sa.Integer(), nullable=False, server_default="0")
    cancellations = sa.Column(sa.Integer(), nullable=False, server_default="0")
    rating_avg = sa.Column(sa.Float(), nullable=False, server_default="0.0")
    is_test_data = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"))

    __table_args__ = (
        sa.UniqueConstraint("service_id", "date", name="uq_service_daily_metric_date"),
    )


class ProviderResponseMetrics(Base, TimestampMixin):
    """Daily aggregated provider response metrics."""

    __tablename__ = "provider_response_metrics"

    id = sa.Column(GUID(), primary_key=True)
    provider_id = sa.Column(GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = sa.Column(sa.String(10), nullable=False, index=True)  # YYYY-MM-DD
    pending_count = sa.Column(sa.Integer(), nullable=False, server_default="0")
    responded_count = sa.Column(sa.Integer(), nullable=False, server_default="0")
    avg_response_minutes = sa.Column(sa.Float(), nullable=False, server_default="0.0")
    is_test_data = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"))

    __table_args__ = (
        sa.UniqueConstraint("provider_id", "date", name="uq_provider_response_metric_date"),
    )


class ProviderActionRecommendation(Base, TimestampMixin):
    """Explainable action recommendations for providers."""

    __tablename__ = "provider_action_recommendations"

    id = sa.Column(GUID(), primary_key=True)
    provider_id = sa.Column(GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = sa.Column(GUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), nullable=True, index=True)
    action_type = sa.Column(sa.String(64), nullable=False, index=True)
    title = sa.Column(sa.String(255), nullable=False)
    reason = sa.Column(sa.Text(), nullable=False)
    evidence = sa.Column(sa.Text(), nullable=False)
    expected_impact = sa.Column(sa.Text(), nullable=False)
    action_text = sa.Column(sa.Text(), nullable=False)
    priority_score = sa.Column(sa.Float(), nullable=False, server_default="0.0")
    model_version = sa.Column(sa.String(64), nullable=False, server_default="v2.0.0")
    generated_at = sa.Column(sa.DateTime(), nullable=False, default=datetime.utcnow)
    is_test_data = sa.Column(sa.Boolean(), nullable=False, server_default=sa.text("false"))

    __table_args__ = (
        sa.Index("idx_provider_action_priority", "provider_id", "priority_score"),
    )
