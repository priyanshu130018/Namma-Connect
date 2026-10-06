"""User similarity calculation pipeline for collaborative filtering."""

import math
import uuid
from typing import Dict, List, Tuple, Optional
from sqlalchemy.orm import Session
from app.modules.recommendation.domain.models import UserInteraction, UserSimilarity
from app.modules.recommendation.features.feature_extractor import InteractionWeights


class UserSimilarityCalculator:
    """Calculates pairwise behavioral similarity between users based on interaction histories."""

    @classmethod
    def compute_pairwise_jaccard_or_cosine(
        cls,
        user1_vectors: Dict[uuid.UUID, float],
        user2_vectors: Dict[uuid.UUID, float],
    ) -> Tuple[float, int]:
        """Compute cosine similarity over service interaction weight vectors.
        
        Returns: (similarity_score: float, common_evidence_count: int)
        """
        common_services = set(user1_vectors.keys()).intersection(set(user2_vectors.keys()))
        evidence_count = len(common_services)
        if evidence_count == 0:
            return 0.0, 0

        # Cosine similarity over service weights
        dot_product = sum(user1_vectors[s] * user2_vectors[s] for s in common_services)
        norm1 = math.sqrt(sum(v * v for v in user1_vectors.values()))
        norm2 = math.sqrt(sum(v * v for v in user2_vectors.values()))

        if norm1 <= 0.0 or norm2 <= 0.0:
            return 0.0, evidence_count

        similarity = dot_product / (norm1 * norm2)
        # Bounded between 0.0 and 1.0
        return max(0.0, min(1.0, similarity)), evidence_count

    @classmethod
    def compute_and_store_similarities_for_user(
        cls,
        db: Session,
        target_user_id: uuid.UUID,
        all_user_interactions: Optional[Dict[uuid.UUID, Dict[uuid.UUID, float]]] = None,
        min_evidence: int = 1,
    ) -> List[UserSimilarity]:
        """Compute similarities between target_user_id and other users, saving to DB.
        
        Strictly enforces canonical ordering user_id_1 < user_id_2 for unique constraint.
        """
        if all_user_interactions is None:
            # Build interaction vector for all active users
            raw_interactions = db.query(UserInteraction).filter(UserInteraction.service_id.isnot(None)).all()
            all_user_interactions = {}
            for inter in raw_interactions:
                uid = inter.user_id
                sid = inter.service_id
                base_w = inter.weight or InteractionWeights.get_weight(inter.event_type)
                decayed = InteractionWeights.calculate_decayed_weight(base_w, inter.created_at)
                if uid not in all_user_interactions:
                    all_user_interactions[uid] = {}
                all_user_interactions[uid][sid] = all_user_interactions[uid].get(sid, 0.0) + decayed

        target_vector = all_user_interactions.get(target_user_id, {})
        if not target_vector:
            return []

        saved_pairs = []
        for other_user_id, other_vector in all_user_interactions.items():
            if other_user_id == target_user_id or not other_vector:
                continue

            sim_score, evidence_count = cls.compute_pairwise_jaccard_or_cosine(target_vector, other_vector)
            if sim_score > 0.0 and evidence_count >= min_evidence:
                # Canonical pair ordering (ensure user_id_1 < user_id_2)
                uid1, uid2 = (
                    (target_user_id, other_user_id)
                    if str(target_user_id) < str(other_user_id)
                    else (other_user_id, target_user_id)
                )

                existing = (
                    db.query(UserSimilarity)
                    .filter(UserSimilarity.user_id_1 == uid1, UserSimilarity.user_id_2 == uid2)
                    .first()
                )

                if existing:
                    existing.similarity_score = sim_score
                    existing.evidence_count = evidence_count
                    saved_pairs.append(existing)
                else:
                    new_pair = UserSimilarity(
                        id=uuid.uuid4(),
                        user_id_1=uid1,
                        user_id_2=uid2,
                        similarity_score=sim_score,
                        evidence_count=evidence_count,
                    )
                    db.add(new_pair)
                    saved_pairs.append(new_pair)

        db.commit()
        return saved_pairs

    @classmethod
    def run_batch_similarity_calculation(cls, db: Session) -> int:
        """Background batch job computing similarity matrix across all users with interaction history."""
        raw_interactions = db.query(UserInteraction).filter(UserInteraction.service_id.isnot(None)).all()
        user_vectors: Dict[uuid.UUID, Dict[uuid.UUID, float]] = {}
        for inter in raw_interactions:
            uid = inter.user_id
            sid = inter.service_id
            base_w = inter.weight or InteractionWeights.get_weight(inter.event_type)
            decayed = InteractionWeights.calculate_decayed_weight(base_w, inter.created_at)
            if uid not in user_vectors:
                user_vectors[uid] = {}
            user_vectors[uid][sid] = user_vectors[uid].get(sid, 0.0) + decayed

        all_users = list(user_vectors.keys())
        updated_count = 0

        for i in range(len(all_users)):
            for j in range(i + 1, len(all_users)):
                u1 = all_users[i]
                u2 = all_users[j]
                sim, count = cls.compute_pairwise_jaccard_or_cosine(user_vectors[u1], user_vectors[u2])
                if sim > 0.0:
                    uid1, uid2 = (u1, u2) if str(u1) < str(u2) else (u2, u1)
                    existing = (
                        db.query(UserSimilarity)
                        .filter(UserSimilarity.user_id_1 == uid1, UserSimilarity.user_id_2 == uid2)
                        .first()
                    )
                    if existing:
                        existing.similarity_score = sim
                        existing.evidence_count = count
                    else:
                        db.add(
                            UserSimilarity(
                                id=uuid.uuid4(),
                                user_id_1=uid1,
                                user_id_2=uid2,
                                similarity_score=sim,
                                evidence_count=count,
                            )
                        )
                    updated_count += 1

        db.commit()
        return updated_count
