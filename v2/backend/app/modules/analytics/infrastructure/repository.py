"""Analytics repository handling NC Score snapshots, metrics, and recommendations."""

import uuid
from typing import Optional, List
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.modules.analytics.domain.models import (
    NCScoreSnapshot,
    ProviderDailyMetrics,
    ProviderActionRecommendation,
)


class AnalyticsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_latest_nc_score(self, provider_id) -> Optional[NCScoreSnapshot]:
        if isinstance(provider_id, str):
            provider_id = uuid.UUID(provider_id)
        return (
            self.db.query(NCScoreSnapshot)
            .filter(NCScoreSnapshot.provider_id == provider_id)
            .order_by(desc(NCScoreSnapshot.calculated_at))
            .first()
        )


    def save_nc_score(self, snapshot: NCScoreSnapshot) -> NCScoreSnapshot:
        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)
        return snapshot

    def get_provider_daily_metrics(self, provider_id, limit: int = 30) -> List[ProviderDailyMetrics]:
        if isinstance(provider_id, str):
            provider_id = uuid.UUID(provider_id)
        return (
            self.db.query(ProviderDailyMetrics)
            .filter(ProviderDailyMetrics.provider_id == provider_id)
            .order_by(desc(ProviderDailyMetrics.date))
            .limit(limit)
            .all()
        )


    def save_daily_metrics(self, metrics: ProviderDailyMetrics) -> ProviderDailyMetrics:
        self.db.add(metrics)
        self.db.commit()
        self.db.refresh(metrics)
        return metrics

    def get_action_recommendations(self, provider_id) -> List[ProviderActionRecommendation]:
        if isinstance(provider_id, str):
            provider_id = uuid.UUID(provider_id)
        return (
            self.db.query(ProviderActionRecommendation)
            .filter(
                ProviderActionRecommendation.provider_id == provider_id,
                ProviderActionRecommendation.status != "DISMISSED",
            )
            .order_by(desc(ProviderActionRecommendation.priority_score))
            .all()
        )
