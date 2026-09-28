"""Analytics application service."""

import json
from typing import Dict, Any, List
from app.modules.analytics.infrastructure.repository import AnalyticsRepository
from app.modules.user.domain.models import User


class AnalyticsService:
    def __init__(self, repo: AnalyticsRepository):
        self.repo = repo

    def get_provider_summary(self, provider: User) -> Dict[str, Any]:
        score_snap = self.repo.get_latest_nc_score(provider.id)
        metrics = self.repo.get_provider_daily_metrics(provider.id, limit=14)
        recs = self.repo.get_action_recommendations(provider.id)

        nc_score_data = None
        if score_snap:
            components = {}
            if score_snap.component_json:
                try:
                    components = json.loads(score_snap.component_json)
                except Exception:
                    components = {}

            nc_score_data = {
                "provider_id": str(score_snap.provider_id),
                "score": float(score_snap.score),
                "reputation_component": float(components.get("reputation", 0.0)),
                "engagement_component": float(components.get("engagement", 0.0)),
                "reliability_component": float(components.get("reliability", 0.0)),
                "snapshot_date": score_snap.calculated_at.isoformat() if score_snap.calculated_at else "",
            }

        metrics_data = [
            {
                "date": str(m.date or ""),
                "views_count": m.views,
                "inquiries_count": m.clicks,
                "bookings_count": m.bookings,
                "revenue": float(m.revenue),
            }
            for m in metrics
        ]

        recs_data = [
            {
                "id": str(r.id),
                "action_type": r.action_type,
                "title": r.title,
                "description": r.message or r.reason or "",
                "impact_score": float(r.priority_score or 0.0),
            }
            for r in recs
        ]

        return {
            "nc_score": nc_score_data,
            "recent_metrics": metrics_data,
            "action_recommendations": recs_data,
        }
