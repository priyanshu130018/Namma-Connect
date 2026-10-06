"""Collaborative Filtering Candidate Recommender."""

import uuid
from typing import Dict, List, Any, Optional, Set
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.modules.recommendation.domain.models import UserSimilarity, UserInteraction
from app.modules.marketplace.domain.models import Service
from app.modules.recommendation.features.feature_extractor import InteractionWeights


class CollaborativeRecommender:
    """Generates candidate services engaged by behaviorally similar users."""

    @classmethod
    def get_similar_users(
        cls,
        db: Session,
        user_id: uuid.UUID,
        top_k: int = 10,
        min_similarity: float = 0.05,
    ) -> List[Dict[str, Any]]:
        """Retrieve top K similar users for a given user."""
        pairs = (
            db.query(UserSimilarity)
            .filter(
                or_(UserSimilarity.user_id_1 == user_id, UserSimilarity.user_id_2 == user_id),
                UserSimilarity.similarity_score >= min_similarity,
            )
            .order_by(desc(UserSimilarity.similarity_score))
            .limit(top_k)
            .all()
        )

        similar_users = []
        for p in pairs:
            other_id = p.user_id_2 if p.user_id_1 == user_id else p.user_id_1
            similar_users.append({
                "user_id": other_id,
                "similarity_score": float(p.similarity_score),
                "evidence_count": p.evidence_count,
            })
        return similar_users

    @classmethod
    def generate_candidates(
        cls,
        db: Session,
        user_id: uuid.UUID,
        exclude_service_ids: Optional[Set[uuid.UUID]] = None,
        top_k_similar_users: int = 15,
        limit: int = 30,
    ) -> List[Dict[str, Any]]:
        """Generate collaborative candidate recommendations based on similar user interactions."""
        similar_users = cls.get_similar_users(db, user_id, top_k=top_k_similar_users)
        if not similar_users:
            return []

        similar_user_map = {u["user_id"]: u["similarity_score"] for u in similar_users}
        similar_uids = list(similar_user_map.keys())

        # Fetch interactions by similar users
        interactions = (
            db.query(UserInteraction)
            .filter(
                UserInteraction.user_id.in_(similar_uids),
                UserInteraction.service_id.isnot(None),
            )
            .all()
        )

        excluded = exclude_service_ids or set()
        service_scores: Dict[uuid.UUID, float] = {}

        for inter in interactions:
            sid = inter.service_id
            if not sid or sid in excluded:
                continue

            sim = similar_user_map.get(inter.user_id, 0.0)
            base_w = inter.weight or InteractionWeights.get_weight(inter.event_type)
            decayed = InteractionWeights.calculate_decayed_weight(base_w, inter.created_at)

            # Score component: similarity * interaction strength
            contribution = sim * decayed
            service_scores[sid] = service_scores.get(sid, 0.0) + contribution

        if not service_scores:
            return []

        # Bulk fetch active candidate services
        service_ids = list(service_scores.keys())
        services = (
            db.query(Service)
            .filter(
                Service.id.in_(service_ids),
                Service.status == "PUBLISHED",
                Service.is_verified.is_(True),
            )
            .all()
        )
        service_map = {s.id: s for s in services}

        candidates = []
        max_score = max(service_scores.values()) if service_scores else 1.0

        for sid, raw_score in service_scores.items():
            svc = service_map.get(sid)
            if not svc:
                continue

            # Normalized collaborative score (0.0 to 1.0)
            norm_score = round(min(1.0, raw_score / max(1.0, max_score)), 4)
            candidates.append({
                "service": svc,
                "service_id": svc.id,
                "collaborative_score": norm_score,
                "reason": "Travelers with similar tastes enjoyed this experience",
                "source": "COLLABORATIVE",
            })

        candidates.sort(key=lambda x: x["collaborative_score"], reverse=True)
        return candidates[:limit]
