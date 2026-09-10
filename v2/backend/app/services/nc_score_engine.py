"""Provider NC Score Engine and Action Recommendation Service.

Implements explainable provider quality scoring (NC Score 7 pillars), Redis caching,
historical snapshots, and actionable decision-support recommendations.
"""

import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple

import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.core.logging import logger
from app.models.user import User
from app.models.service import Service, Review
from app.models.booking import Booking
from app.models.partner_application import PartnerApplication
from app.models.nc_score import (
    NCScoreSnapshot,
    ProviderDailyMetrics,
    ServiceDailyMetrics,
    ProviderResponseMetrics,
    ProviderActionRecommendation,
)
from app.services.redis_service import RedisService


class NCScoreEngine:
    """Provider quality & explainable NC Score computation engine."""

    MODEL_VERSION = "v2.0.0"

    @classmethod
    def calculate_nc_score(
        cls,
        db: Session,
        provider_id: uuid.UUID,
        service_id: Optional[uuid.UUID] = None,
        force_refresh: bool = False,
    ) -> Tuple[float, Dict[str, float]]:
        """Calculate explainable provider NC Score using the exact 7-component formula:

        NC_SCORE = 100 * (
          0.25 * COMPLETION +
          0.20 * RESPONSE +
          0.20 * BAYESIAN_RATING +
          0.15 * RELIABILITY +
          0.10 * ACCEPTANCE +
          0.05 * REPEAT_CUSTOMERS +
          0.05 * PROFILE_COMPLETENESS
        )
        """
        cache_key = f"nc_score:provider:{provider_id}"
        if not force_refresh:
            cached = RedisService.get(cache_key)
            if cached and isinstance(cached, dict) and "score" in cached and "components" in cached:
                return float(cached["score"]), cached["components"]

        provider = db.query(User).filter(User.id == provider_id).first()
        if not provider:
            return 0.0, {}

        # 1. BAYESIAN_RATING (0..1)
        services = db.query(Service).filter(Service.provider_id == provider_id).all()
        if service_id:
            services = [s for s in services if s.id == service_id]

        total_reviews = sum(s.reviews_count for s in services)
        avg_rating = sum(s.rating * s.reviews_count for s in services) / float(total_reviews) if total_reviews > 0 else 4.5

        prior_weight = 5.0
        prior_mean = 4.0
        adjusted_rating = ((total_reviews * avg_rating) + (prior_weight * prior_mean)) / (total_reviews + prior_weight)
        bayesian_rating = max(0.0, min(1.0, adjusted_rating / 5.0))

        # 2. COMPLETION RATE (0..1)
        bookings = db.query(Booking).filter(Booking.provider_id == provider_id).all()
        total_b = len(bookings)
        completed_b = sum(1 for b in bookings if b.status == "COMPLETED")
        cancelled_b = sum(1 for b in bookings if b.status == "CANCELLED")
        
        if (completed_b + cancelled_b) > 0:
            completion_rate = completed_b / float(completed_b + cancelled_b)
        else:
            completion_rate = 1.0  # Default full score for new providers with zero cancellations

        # 3. RESPONSE TIME (0..1) - Real computed from ProviderResponseMetrics or default
        resp_metric = db.query(ProviderResponseMetrics).filter(ProviderResponseMetrics.provider_id == provider_id).first()
        avg_resp_mins = resp_metric.avg_response_minutes if resp_metric else 10.0
        response_score = max(0.0, min(1.0, 1.0 - max(0.0, avg_resp_mins - 5.0) / 55.0))

        # 4. RELIABILITY (0..1) - Inverse cancellation rate
        if total_b > 0:
            cancellation_rate = cancelled_b / float(total_b)
            reliability_score = max(0.0, min(1.0, 1.0 - cancellation_rate))
        else:
            reliability_score = 1.0

        # 5. ACCEPTANCE RATE (0..1)
        daily_metrics = db.query(ProviderDailyMetrics).filter(ProviderDailyMetrics.provider_id == provider_id).all()
        total_leads = sum(m.total_leads for m in daily_metrics) if daily_metrics else 0
        accepted_leads = sum(m.accepted_leads for m in daily_metrics) if daily_metrics else 0
        acceptance_rate = (accepted_leads / float(total_leads)) if total_leads > 0 else 1.0

        # 6. REPEAT CUSTOMERS (0..1)
        if total_b > 0:
            customer_ids = [b.customer_id for b in bookings if b.customer_id]
            repeat_customers = len(customer_ids) - len(set(customer_ids))
            repeat_score = min(1.0, max(0.0, repeat_customers / float(total_b)))
        else:
            repeat_score = 0.5  # Neutral starting score for new providers

        # 7. PROFILE COMPLETENESS (0..1)
        completeness_checks = [
            bool(provider.full_name),
            bool(provider.email),
            bool(provider.mobile),
            bool(provider.avatar_url),
            bool(provider.is_verified),
            bool(services),
            bool(getattr(provider, "location", None)),
        ]
        profile_completeness = sum(1 for c in completeness_checks if c) / float(len(completeness_checks))

        # Combine exact 7-pillar weights
        final_nc_score = 100.0 * (
            0.25 * completion_rate
            + 0.20 * response_score
            + 0.20 * bayesian_rating
            + 0.15 * reliability_score
            + 0.10 * acceptance_rate
            + 0.05 * repeat_score
            + 0.05 * profile_completeness
        )

        # Assign Tier
        tier = "Platinum"
        if final_nc_score < 60.0:
            tier = "Bronze"
        elif final_nc_score < 75.0:
            tier = "Silver"
        elif final_nc_score < 90.0:
            tier = "Gold"

        components = {
            "completion_rate": round(completion_rate * 100, 1),
            "response_score": round(response_score * 100, 1),
            "bayesian_rating": round(bayesian_rating * 100, 1),
            "reliability_score": round(reliability_score * 100, 1),
            "acceptance_rate": round(acceptance_rate * 100, 1),
            "repeat_customers": round(repeat_score * 100, 1),
            "profile_completeness": round(profile_completeness * 100, 1),
            "tier": tier,
        }

        # Persist historical snapshot
        snapshot = NCScoreSnapshot(
            id=uuid.uuid4(),
            provider_id=provider_id,
            service_id=service_id,
            score=round(final_nc_score, 2),
            component_json=json.dumps(components),
            model_version=cls.MODEL_VERSION,
            calculated_at=datetime.utcnow(),
        )
        db.add(snapshot)
        db.commit()

        res_payload = {
            "score": round(final_nc_score, 2),
            "components": components,
        }

        # Cache in Redis under nc_score:provider:<id> (TTL 600s)
        try:
            RedisService.set(cache_key, res_payload, ttl_seconds=600)
        except Exception:
            pass

        return round(final_nc_score, 2), components

    @classmethod
    def generate_provider_action_recommendations(
        cls,
        db: Session,
        provider_id: uuid.UUID,
    ) -> List[Dict[str, Any]]:
        """Generate decision-support action recommendations for providers based on operational triggers.

        ACTION_PRIORITY = 100 * (
          0.30 * BOOKING_IMPACT +
          0.20 * DEMAND_SIGNAL +
          0.15 * EASE_OF_ACTION +
          0.15 * REVENUE_UPSIDE +
          0.10 * QUALITY_GAP +
          0.10 * RECENCY
        )
        """
        provider = db.query(User).filter(User.id == provider_id).first()
        if not provider:
            return []

        services = db.query(Service).filter(Service.provider_id == provider_id).all()
        bookings = db.query(Booking).filter(Booking.provider_id == provider_id).all()
        actions = []

        total_b = len(bookings)
        cancelled_b = sum(1 for b in bookings if b.status == "CANCELLED")
        cancellation_rate = (cancelled_b / float(total_b)) if total_b > 0 else 0.0

        resp_metric = db.query(ProviderResponseMetrics).filter(ProviderResponseMetrics.provider_id == provider_id).first()
        avg_resp_mins = resp_metric.avg_response_minutes if resp_metric else 10.0

        completeness_checks = [
            bool(provider.full_name),
            bool(provider.email),
            bool(provider.mobile),
            bool(provider.avatar_url),
            bool(provider.is_verified),
            bool(services),
        ]
        profile_completeness = sum(1 for c in completeness_checks if c) / float(len(completeness_checks))

        total_reviews = sum(s.reviews_count for s in services)
        avg_rating = sum(s.rating * s.reviews_count for s in services) / float(total_reviews) if total_reviews > 0 else 5.0

        # Trigger 1: INCOMPLETE_PROFILE (profile completeness < 90%)
        if profile_completeness < 0.90:
            priority = 100.0 * (0.30 * 0.8 + 0.20 * 0.7 + 0.15 * 0.9 + 0.15 * 0.7 + 0.10 * 0.9 + 0.10 * 0.9)
            actions.append({
                "action_type": "INCOMPLETE_PROFILE",
                "title": "Complete Your Provider Profile",
                "reason": "Profile completeness is below 90%. Missing photo or verification reduces trust.",
                "evidence": f"Current profile completeness is {round(profile_completeness * 100)}%.",
                "expected_impact": "Increase traveler booking confidence and search visibility.",
                "action_text": "Update Profile",
                "priority_score": round(priority, 2),
                "generated_at": datetime.utcnow().isoformat(),
            })

        # Trigger 2: RESPONSE_TIME_SLOW (avg response > 15 minutes)
        if avg_resp_mins > 15.0:
            priority = 100.0 * (0.30 * 0.85 + 0.20 * 0.8 + 0.15 * 0.85 + 0.15 * 0.8 + 0.10 * 0.85 + 0.10 * 0.9)
            actions.append({
                "action_type": "RESPONSE_TIME_SLOW",
                "title": "Improve Response Time to Inquiries",
                "reason": "Average response time exceeds 15 minutes.",
                "evidence": f"Current average response time is {round(avg_resp_mins, 1)} minutes.",
                "expected_impact": "Faster responses convert up to 40% more traveler inquiries.",
                "action_text": "Enable Instant Alerts",
                "priority_score": round(priority, 2),
                "generated_at": datetime.utcnow().isoformat(),
            })

        # Trigger 3: HIGH_CANCELLATION (cancellation rate > 5%)
        if cancellation_rate > 0.05:
            priority = 100.0 * (0.30 * 0.95 + 0.20 * 0.85 + 0.15 * 0.75 + 0.15 * 0.85 + 0.10 * 0.9 + 0.10 * 0.9)
            actions.append({
                "action_type": "HIGH_CANCELLATION",
                "title": "Reduce Provider Cancellation Rate",
                "reason": "Cancellation rate is above 5%, hurting reliability score.",
                "evidence": f"Cancellation rate is {round(cancellation_rate * 100, 1)}% across {total_b} bookings.",
                "expected_impact": "Avoid penalty demotions in search ranking and build repeat clientele.",
                "action_text": "Sync Calendar Availability",
                "priority_score": round(priority, 2),
                "generated_at": datetime.utcnow().isoformat(),
            })

        # Trigger 4: RATING_BOOST (avg rating < 4.5)
        if avg_rating < 4.5:
            priority = 100.0 * (0.30 * 0.8 + 0.20 * 0.75 + 0.15 * 0.8 + 0.15 * 0.75 + 0.10 * 0.85 + 0.10 * 0.85)
            actions.append({
                "action_type": "RATING_BOOST",
                "title": "Collect Reviews from Satisfied Guests",
                "reason": "Average rating is below 4.5 stars.",
                "evidence": f"Current average rating is {round(avg_rating, 2)} stars from {total_reviews} reviews.",
                "expected_impact": "High-rated services gain Platinum tier status and prime home placement.",
                "action_text": "Request Review Link",
                "priority_score": round(priority, 2),
                "generated_at": datetime.utcnow().isoformat(),
            })

        # Trigger 5: Availability Optimization
        for srv in services:
            if srv.reviews_count >= 2 and srv.rating >= 4.8:
                priority = 100.0 * (0.30 * 0.9 + 0.20 * 0.8 + 0.15 * 0.8 + 0.15 * 0.85 + 0.10 * 0.5 + 0.10 * 0.8)
                actions.append({
                    "action_type": "AVAILABILITY_OPTIMIZATION",
                    "title": f"Expand Availability for '{srv.title}'",
                    "reason": f"High demand and 4.8+ rating detected for {srv.title}.",
                    "evidence": f"Service has {srv.reviews_count} reviews with average rating {srv.rating}.",
                    "expected_impact": "Capture additional weekend travelers.",
                    "action_text": "Review Availability Calendar",
                    "priority_score": round(priority, 2),
                    "generated_at": datetime.utcnow().isoformat(),
                })

        # Sort actions by priority_score descending
        actions.sort(key=lambda a: a["priority_score"], reverse=True)
        return actions
