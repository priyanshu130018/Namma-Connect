"""Personalized Recommendation Engine for NammaConnect V2.

Implements candidate generation, eligibility filtering, 8-component weighted scoring,
collaborative filtering precomputation, 7-day half-life decay, diversity re-ranking, and Redis caching.
"""

import hashlib
import json
import math
import random
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple

import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.models.user import User
from app.models.service import Service, Review, MarketplaceCategory
from app.models.booking import Booking
from app.models.saved_service import SavedService
from app.models.recommendation import (
    UserInteraction,
    UserInterestProfile,
    UserSimilarity,
    RecommendationResult,
    RecommendationImpression,
    RecommendationFeedback,
)
from app.services.embedding import EmbeddingService
from app.services.search import SemanticSearchService, _cosine_similarity
from app.services.redis_service import RedisService


class InteractionWeights:
    """Configurable weights for customer behavioral signals with exponential decay."""
    WEIGHTS: Dict[str, float] = {
        "booking_complete": 5.0,
        "booking_completed": 5.0,
        "booking_start": 3.0,
        "save": 3.0,
        "review_submit": 2.5,
        "rating_5": 2.5,
        "search_click": 2.0,
        "category_click": 1.5,
        "search": 1.5,
        "click": 1.5,
        "click_result": 1.5,
        "view": 1.0,
        "view_detail": 1.0,
        "feedback": 1.0,
        "share": 1.5,
        "dislike": -2.0,
        "explicit_hide": -3.0,
        "unsave": 0.0,
    }

    HALF_LIFE_DAYS: float = 7.0
    DECAY_LAMBDA: float = math.log(2.0) / 7.0  # ~0.099021

    @classmethod
    def get_weight(cls, event_type: str) -> float:
        return cls.WEIGHTS.get(event_type.lower(), 1.0)

    @classmethod
    def calculate_decayed_weight(cls, base_weight: float, created_at: datetime) -> float:
        """Calculate exponential time-decay weight with 7-day half-life."""
        age_days = (datetime.utcnow() - created_at).total_seconds() / 86400.0
        if age_days < 0:
            age_days = 0.0
        return base_weight * math.exp(-cls.DECAY_LAMBDA * age_days)


class RecommendationEngine:
    """Core Personalized Recommendation Engine."""

    MODEL_VERSION = "v2.0.0"

    @classmethod
    def record_interaction(
        cls,
        db: Session,
        user_id: uuid.UUID,
        event_type: str,
        service_id: Optional[uuid.UUID] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> UserInteraction:
        """Record customer interaction event, propagate synthetic flag, and update interest profile."""
        norm_event = event_type.lower().strip()
        weight = InteractionWeights.get_weight(norm_event)

        user = db.query(User).filter(User.id == user_id).first()
        is_synthetic = bool(user.is_synthetic if user else False)

        provider_id = None
        category_id = None
        meta = dict(metadata or {})

        if service_id:
            srv = db.query(Service).filter(Service.id == service_id).first()
            if srv:
                provider_id = srv.provider_id
                category_id = srv.category_id
                if "category_slug" not in meta and srv.category_slug:
                    meta["category_slug"] = srv.category_slug
                if "district" not in meta and srv.district:
                    meta["district"] = srv.district
        elif meta.get("category_slug"):
            cat = db.query(MarketplaceCategory).filter(MarketplaceCategory.slug == meta["category_slug"]).first()
            if cat:
                category_id = cat.id

        interaction = UserInteraction(
            id=uuid.uuid4(),
            user_id=user_id,
            service_id=service_id,
            provider_id=provider_id,
            category_id=category_id,
            event_type=norm_event.upper(),
            weight=weight,
            metadata_json=json.dumps(meta),
            is_synthetic=is_synthetic,
            is_test_data=is_synthetic,
        )
        db.add(interaction)
        db.commit()
        db.refresh(interaction)

        # Invalidate recommendation cache for this user
        try:
            RedisService.delete(f"recommendations:user:{user_id}:home")
            RedisService.delete(f"explore:feed:user:{user_id}")
        except Exception:
            pass

        # Trigger profile update
        try:
            cls.update_user_interest_profile(db, user_id)
        except Exception as err:
            logger.warning(f"Incremental interest profile update failed for user {user_id}: {err}")

        return interaction

    @classmethod
    def update_user_interest_profile(cls, db: Session, user_id: uuid.UUID) -> UserInterestProfile:
        """Derive user_interest_profile using explicit travel preferences, real behavior, and 7-day half-life decay."""
        user = db.query(User).filter(User.id == user_id).first()
        is_synthetic = bool(user.is_synthetic if user else False)

        profile = db.query(UserInterestProfile).filter(UserInterestProfile.user_id == user_id).first()
        if not profile:
            profile = UserInterestProfile(
                id=uuid.uuid4(),
                user_id=user_id,
                category_affinity_json="{}",
                destination_affinity_json="{}",
                topic_affinity_json="{}",
                budget_band_json='{"min": 500, "max": 10000}',
                is_synthetic=is_synthetic,
                is_test_data=is_synthetic,
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
        else:
            profile.is_synthetic = is_synthetic
            profile.is_test_data = is_synthetic

        # 1. Fetch interactions
        interactions = (
            db.query(UserInteraction)
            .filter(UserInteraction.user_id == user_id)
            .order_by(UserInteraction.created_at.desc())
            .limit(200)
            .all()
        )

        # 2. Fetch saved services
        saved_services = (
            db.query(Service)
            .join(SavedService, SavedService.service_id == Service.id)
            .filter(SavedService.user_id == user_id)
            .all()
        )

        # 3. Fetch completed bookings
        completed_bookings = (
            db.query(Service)
            .join(Booking, Booking.service_id == Service.id)
            .filter(Booking.customer_id == user_id, Booking.status == "COMPLETED")
            .all()
        )

        category_scores: Dict[str, float] = {}
        destination_scores: Dict[str, float] = {}
        topic_scores: Dict[str, float] = {}
        prices: List[float] = []

        # 4. Incorporate explicit user travel preferences (Requirement 2: explicit profile preferences)
        has_explicit_prefs = False
        if user and getattr(user, "travel_preferences", None):
            prefs = user.travel_preferences
            if isinstance(prefs, str):
                try:
                    prefs = json.loads(prefs)
                except Exception:
                    prefs = {}
            if isinstance(prefs, dict) and prefs:
                has_explicit_prefs = True
                for item in prefs.get("interests", []):
                    ik = str(item).lower().strip()
                    category_scores[ik] = category_scores.get(ik, 0.0) + 3.0
                    topic_scores[ik] = topic_scores.get(ik, 0.0) + 2.0
                for item in prefs.get("preferred_activities", []):
                    ik = str(item).lower().strip()
                    category_scores[ik] = category_scores.get(ik, 0.0) + 2.5
                    topic_scores[ik] = topic_scores.get(ik, 0.0) + 1.5
                for dest in prefs.get("preferred_destinations", []):
                    dk = str(dest).strip()
                    destination_scores[dk] = destination_scores.get(dk, 0.0) + 3.0
                bb = prefs.get("budget_band")
                if isinstance(bb, dict) and "min" in bb and "max" in bb:
                    prices.append(float(bb["min"]))
                    prices.append(float(bb["max"]))

        # 5. Process interactions with 7-day half-life decay
        for inter in interactions:
            decayed = InteractionWeights.calculate_decayed_weight(inter.weight, inter.created_at)
            meta = json.loads(inter.metadata_json or "{}") if isinstance(inter.metadata_json, str) else (inter.metadata_json or {})
            cat = meta.get("category_slug") or meta.get("category")
            if cat:
                category_scores[cat.lower()] = category_scores.get(cat.lower(), 0.0) + decayed
            dest = meta.get("district") or meta.get("location")
            if dest:
                destination_scores[dest] = destination_scores.get(dest, 0.0) + decayed
            topic = meta.get("topic") or meta.get("query")
            if topic:
                for word in topic.lower().split():
                    if len(word) > 3:
                        topic_scores[word] = topic_scores.get(word, 0.0) + decayed * 0.5

        # 6. Process saved services (base weight 3.0)
        for srv in saved_services:
            category_scores[srv.category_slug] = category_scores.get(srv.category_slug, 0.0) + 3.0
            destination_scores[srv.district] = destination_scores.get(srv.district, 0.0) + 3.0
            prices.append(srv.price)

        # 7. Process completed bookings (base weight 5.0)
        for srv in completed_bookings:
            category_scores[srv.category_slug] = category_scores.get(srv.category_slug, 0.0) + 5.0
            destination_scores[srv.district] = destination_scores.get(srv.district, 0.0) + 5.0
            prices.append(srv.price)

        # Normalize category affinities (0..1)
        max_cat = max(category_scores.values()) if category_scores else 1.0
        normalized_cat = {k: min(1.0, round(v / max_cat, 3)) for k, v in category_scores.items() if v > 0}

        # Normalize destination affinities (0..1)
        max_dest = max(destination_scores.values()) if destination_scores else 1.0
        normalized_dest = {k: min(1.0, round(v / max_dest, 3)) for k, v in destination_scores.items() if v > 0}

        # Normalize topic affinities (0..1)
        max_topic = max(topic_scores.values()) if topic_scores else 1.0
        normalized_topic = {k: min(1.0, round(v / max_topic, 3)) for k, v in topic_scores.items() if v > 0}

        # Budget band calculation
        if prices:
            min_p = max(500.0, min(prices) * 0.8)
            max_p = max(min_p + 1000.0, max(prices) * 1.3)
        else:
            min_p, max_p = 500.0, 10000.0

        budget_band = {"min": round(min_p, 2), "max": round(max_p, 2)}
        total_signals = len(interactions) + len(saved_services) + len(completed_bookings)

        profile.category_affinity_json = json.dumps(normalized_cat)
        profile.destination_affinity_json = json.dumps(normalized_dest)
        profile.topic_affinity_json = json.dumps(normalized_topic)
        profile.budget_band_json = json.dumps(budget_band)
        profile.interaction_count = total_signals
        profile.confidence_score = min(1.0, round((total_signals * 0.05) + (0.35 if has_explicit_prefs else 0.0), 2))
        profile.interest_score = min(1.0, round(0.5 + (0.2 if has_explicit_prefs else 0.0) + (total_signals * 0.02), 2))
        profile.last_updated = datetime.utcnow()

        db.commit()
        db.refresh(profile)
        return profile

    @classmethod
    def compute_user_similarity(cls, db: Session, user1_id: uuid.UUID, user2_id: uuid.UUID) -> float:
        """Compute Jaccard similarity between two users based on interaction evidence."""
        if user1_id == user2_id:
            return 1.0

        saved1 = set(r[0] for r in db.query(SavedService.service_id).filter(SavedService.user_id == user1_id).all())
        saved2 = set(r[0] for r in db.query(SavedService.service_id).filter(SavedService.user_id == user2_id).all())

        booked1 = set(r[0] for r in db.query(Booking.service_id).filter(Booking.customer_id == user1_id, Booking.status == "COMPLETED").all())
        booked2 = set(r[0] for r in db.query(Booking.service_id).filter(Booking.customer_id == user2_id, Booking.status == "COMPLETED").all())

        all1 = saved1.union(booked1)
        all2 = saved2.union(booked2)

        intersection = len(all1.intersection(all2))
        union = len(all1.union(all2))

        if union == 0 or (len(all1) + len(all2)) < 2:
            return 0.0

        jaccard = intersection / float(union)
        return min(1.0, round(jaccard, 3))

    @classmethod
    def compute_all_user_similarities(cls, db: Session) -> int:
        """Precompute and store user similarity matrix in background worker."""
        active_users = [u.id for u in db.query(User.id).filter(User.is_active == True).limit(200).all()]
        count = 0

        for i in range(len(active_users)):
            for j in range(i + 1, len(active_users)):
                u1 = active_users[i]
                u2 = active_users[j]
                sim = cls.compute_user_similarity(db, u1, u2)
                if sim > 0.05:
                    # Upsert similarity u1 -> u2
                    row = db.query(UserSimilarity).filter(
                        UserSimilarity.user_id_1 == u1,
                        UserSimilarity.user_id_2 == u2,
                    ).first()
                    if not row:
                        row = UserSimilarity(
                            id=uuid.uuid4(),
                            user_id_1=u1,
                            user_id_2=u2,
                            similarity_score=sim,
                        )
                        db.add(row)
                    else:
                        row.similarity_score = sim
                        row.updated_at = datetime.utcnow()
                    count += 1
        db.commit()
        return count

    @classmethod
    def get_user_collaborative_score(cls, db: Session, user_id: uuid.UUID, service_id: uuid.UUID) -> float:
        """Retrieve real precomputed collaborative score for candidate service."""
        if not user_id:
            return 0.0

        # Query top 5 similar users for current user
        sim_rows = (
            db.query(UserSimilarity)
            .filter(
                (UserSimilarity.user_id_1 == user_id) | (UserSimilarity.user_id_2 == user_id)
            )
            .order_by(UserSimilarity.similarity_score.desc())
            .limit(5)
            .all()
        )
        if not sim_rows:
            return 0.0

        similar_user_ids = []
        sim_map = {}
        for r in sim_rows:
            other_id = r.user_id_2 if r.user_id_1 == user_id else r.user_id_1
            similar_user_ids.append(other_id)
            sim_map[other_id] = r.similarity_score

        # Check engagement of similar users with candidate service
        saved_count = db.query(SavedService).filter(
            SavedService.service_id == service_id,
            SavedService.user_id.in_(similar_user_ids),
        ).count()

        booked_count = db.query(Booking).filter(
            Booking.service_id == service_id,
            Booking.customer_id.in_(similar_user_ids),
            Booking.status == "COMPLETED",
        ).count()

        if booked_count > 0:
            avg_sim = sum(sim_map.values()) / float(len(sim_map))
            return min(1.0, round(avg_sim * 1.2, 3))
        elif saved_count > 0:
            avg_sim = sum(sim_map.values()) / float(len(sim_map))
            return min(1.0, round(avg_sim * 0.8, 3))

        return 0.0

    @classmethod
    def generate_candidates(cls, db: Session, user_id: Optional[uuid.UUID], candidate_k: int = 30) -> List[Service]:
        """Generate candidate pool from personal interest, top-rated, most visited, and collaborative sources."""
        valid_provider_ids = set(
            u[0] for u in db.query(User.id).filter(User.is_active == True, User.is_verified == True).all()
        )
        eligible_services = (
            db.query(Service)
            .filter(
                Service.status == "PUBLISHED",
                Service.is_verified == True,
                Service.provider_id.in_(valid_provider_ids),
            )
            .all()
        )
        if not eligible_services:
            return []

        if len(eligible_services) <= candidate_k:
            return eligible_services

        profile = db.query(UserInterestProfile).filter(UserInterestProfile.user_id == user_id).first() if user_id else None
        cat_aff = json.loads(profile.category_affinity_json) if profile else {}
        dest_aff = json.loads(profile.destination_affinity_json) if profile else {}

        top_cats = set(cat_aff.keys())
        top_dests = set(dest_aff.keys())

        candidates: List[Service] = []
        seen_ids = set()

        # Personal interest candidates
        for s in eligible_services:
            if s.category_slug in top_cats or s.district in top_dests:
                if s.id not in seen_ids:
                    candidates.append(s)
                    seen_ids.add(s.id)

        # Top-rated candidates
        for s in sorted(eligible_services, key=lambda x: x.rating, reverse=True):
            if s.id not in seen_ids and len(candidates) < candidate_k:
                candidates.append(s)
                seen_ids.add(s.id)

        # Popular / reviewed candidates
        for s in sorted(eligible_services, key=lambda x: x.reviews_count, reverse=True):
            if s.id not in seen_ids and len(candidates) < candidate_k:
                candidates.append(s)
                seen_ids.add(s.id)

        return candidates[:candidate_k]

    @classmethod
    def build_user_scoring_context(cls, db: Session, user_id: Optional[uuid.UUID]) -> Dict[str, Any]:
        """Precompute user engagement and collaborative sets once per request to avoid O(N) DB queries."""
        if not user_id:
            return {
                "user_saved_ids": set(),
                "user_booked_ids": set(),
                "user_interacted_ids": set(),
                "sim_booked_ids": set(),
                "sim_saved_ids": set(),
                "avg_sim": 0.0,
            }

        user_saved_ids = set(
            r[0] for r in db.query(SavedService.service_id).filter(SavedService.user_id == user_id).all()
        )
        user_booked_ids = set(
            r[0] for r in db.query(Booking.service_id).filter(
                Booking.customer_id == user_id, Booking.status == "COMPLETED"
            ).all()
        )
        user_interacted_ids = set(
            r[0] for r in db.query(UserInteraction.service_id).filter(
                UserInteraction.user_id == user_id, UserInteraction.service_id.isnot(None)
            ).all()
        )

        sim_rows = (
            db.query(UserSimilarity)
            .filter((UserSimilarity.user_id_1 == user_id) | (UserSimilarity.user_id_2 == user_id))
            .order_by(UserSimilarity.similarity_score.desc())
            .limit(5)
            .all()
        )
        sim_map = {}
        for r in sim_rows:
            other_id = r.user_id_2 if r.user_id_1 == user_id else r.user_id_1
            sim_map[other_id] = r.similarity_score

        similar_user_ids = list(sim_map.keys())
        sim_booked_ids = set()
        sim_saved_ids = set()
        avg_sim = 0.0
        if similar_user_ids:
            avg_sim = sum(sim_map.values()) / float(len(sim_map))
            sim_booked_ids = set(
                r[0] for r in db.query(Booking.service_id).filter(
                    Booking.customer_id.in_(similar_user_ids),
                    Booking.status == "COMPLETED"
                ).all()
            )
            sim_saved_ids = set(
                r[0] for r in db.query(SavedService.service_id).filter(
                    SavedService.user_id.in_(similar_user_ids)
                ).all()
            )

        return {
            "user_saved_ids": user_saved_ids,
            "user_booked_ids": user_booked_ids,
            "user_interacted_ids": user_interacted_ids,
            "sim_booked_ids": sim_booked_ids,
            "sim_saved_ids": sim_saved_ids,
            "avg_sim": avg_sim,
        }

    @classmethod
    def calculate_final_score(
        cls,
        service: Service,
        user_id: Optional[uuid.UUID],
        profile: Optional[UserInterestProfile],
        user_vector: Optional[List[float]],
        db: Session,
        location: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Tuple[float, str]:
        """Calculate recommendation score using the exact approved 8-component formula:

        FINAL_SCORE = 100 * (
          0.25 * INTERACTION +
          0.20 * CATEGORY +
          0.15 * EMBEDDING +
          0.15 * PROXIMITY +
          0.10 * RATING +
          0.05 * POPULARITY +
          0.05 * FRESHNESS +
          0.05 * SIMILARITY
        )
        """
        # 1. INTERACTION (0..1) - Personal history
        interaction_score = 0.0
        if user_id:
            if context is not None:
                if service.id in context.get("user_booked_ids", set()):
                    interaction_score = 1.0
                elif service.id in context.get("user_saved_ids", set()):
                    interaction_score = 0.8
                elif service.id in context.get("user_interacted_ids", set()):
                    interaction_score = 0.5
            else:
                saved_count = db.query(SavedService).filter(SavedService.user_id == user_id, SavedService.service_id == service.id).count()
                booked_count = db.query(Booking).filter(Booking.customer_id == user_id, Booking.service_id == service.id, Booking.status == "COMPLETED").count()
                if booked_count > 0:
                    interaction_score = 1.0
                elif saved_count > 0:
                    interaction_score = 0.8
                else:
                    inter_count = db.query(UserInteraction).filter(UserInteraction.user_id == user_id, UserInteraction.service_id == service.id).count()
                    interaction_score = 0.5 if inter_count > 0 else 0.0

        # 2. CATEGORY (0..1) - Category affinity
        category_score = 0.2
        if profile and profile.category_affinity_json:
            cat_map = json.loads(profile.category_affinity_json)
            category_score = cat_map.get(service.category_slug, 0.2)

        # 3. EMBEDDING (0..1) - Vector semantic similarity
        embedding_score = 0.5
        if user_vector and service.embedding:
            try:
                emb_list = list(service.embedding) if hasattr(service.embedding, "__iter__") else []
                if len(emb_list) == 768:
                    embedding_score = max(0.0, _cosine_similarity(user_vector, emb_list))
            except Exception:
                pass

        # 4. PROXIMITY (0..1) - Location match
        proximity_score = 0.3
        if location and service.location:
            loc_lower = location.lower()
            if loc_lower in service.location.lower() or loc_lower in service.district.lower():
                proximity_score = 1.0
            elif service.state and loc_lower in service.state.lower():
                proximity_score = 0.6

        # 5. RATING (0..1) - Service rating
        rating_score = min(1.0, max(0.0, (service.rating or 4.0) / 5.0))

        # 6. POPULARITY (0..1) - Real computed review/booking depth
        popularity_score = min(1.0, max(0.0, service.reviews_count / 20.0))

        # 7. FRESHNESS (0..1) - Exponential 30-day half-life decay from creation
        fresh_lambda = math.log(2.0) / 30.0
        srv_created = getattr(service, "created_at", datetime.utcnow())
        age_days = (datetime.utcnow() - srv_created).total_seconds() / 86400.0 if srv_created else 0.0
        freshness_score = math.exp(-fresh_lambda * max(0.0, age_days))

        # 8. SIMILARITY (0..1) - Real precomputed collaborative filtering score
        similarity_score = 0.0
        if user_id:
            if context is not None:
                sim_booked = context.get("sim_booked_ids", set())
                sim_saved = context.get("sim_saved_ids", set())
                avg_sim = context.get("avg_sim", 0.0)
                if service.id in sim_booked:
                    similarity_score = min(1.0, round(avg_sim * 1.2, 3))
                elif service.id in sim_saved:
                    similarity_score = min(1.0, round(avg_sim * 0.8, 3))
            else:
                similarity_score = cls.get_user_collaborative_score(db, user_id, service.id)

        # Compute exact 8-component FINAL_SCORE
        final_score = 100.0 * (
            0.25 * interaction_score +
            0.20 * category_score +
            0.15 * embedding_score +
            0.15 * proximity_score +
            0.10 * rating_score +
            0.05 * popularity_score +
            0.05 * freshness_score +
            0.05 * similarity_score
        )

        reason = "Matched your category & location preferences"
        if interaction_score >= 0.8:
            reason = "Based on your saved & completed experiences"
        elif similarity_score >= 0.5:
            reason = "Popular among travelers with similar tastes"
        elif rating_score >= 0.95:
            reason = "Top rated certified rural experience"

        return round(final_score, 2), reason

    @classmethod
    def get_home_recommendations(
        cls,
        user: Optional[User],
        db: Session,
        location: Optional[str] = None,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """Fetch customer Home page recommendations with Redis caching and diversity caps."""
        user_id = user.id if user else None

        # Check Redis Cache
        cache_key = f"recommendations:user:{user_id or 'guest'}:home"
        if not force_refresh:
            cached = RedisService.get(cache_key)
            if cached and isinstance(cached, dict):
                return cached

        # Fetch eligible catalog items
        candidates = cls.generate_candidates(db, user_id=user_id, candidate_k=30)
        if not candidates:
            valid_provider_ids = set(
                u[0] for u in db.query(User.id).filter(User.is_active == True, User.is_verified == True).all()
            )
            candidates = (
                db.query(Service)
                .filter(
                    Service.status == "PUBLISHED",
                    Service.is_verified == True,
                    Service.provider_id.in_(valid_provider_ids),
                )
                .all()
            )

        profile = db.query(UserInterestProfile).filter(UserInterestProfile.user_id == user_id).first() if user_id else None

        # User vector representation
        user_vector = None
        if profile and profile.topic_affinity_json:
            topics = " ".join(json.loads(profile.topic_affinity_json).keys())
            user_vector = EmbeddingService.generate_embedding(topics)

        scoring_context = cls.build_user_scoring_context(db, user_id)
        scored_items = []
        for srv in candidates:
            score, reason = cls.calculate_final_score(
                service=srv,
                user_id=user_id,
                profile=profile,
                user_vector=user_vector,
                db=db,
                location=location,
                context=scoring_context,
            )
            scored_items.append({
                "service": srv,
                "score": score,
                "reason": reason,
            })

        # Sort by score descending
        scored_items.sort(key=lambda x: x["score"], reverse=True)

        def serialize_service(s: Service) -> Dict[str, Any]:
            return {
                "id": str(s.id),
                "title": s.title,
                "slug": s.slug,
                "description": s.description,
                "category": s.category,
                "category_slug": s.category_slug,
                "location": s.location,
                "district": s.district,
                "state": s.state,
                "price": s.price,
                "unit": s.unit,
                "rating": s.rating,
                "reviews_count": s.reviews_count,
                "is_verified": s.is_verified,
                "status": s.status,
                "provider_id": str(s.provider_id) if s.provider_id else None,
                "provider_name": s.provider_name,
                "provider_type": s.provider_type,
                "primary_image": s.primary_image,
                "formatted_address": getattr(s, "formatted_address", s.location),
            }

        # Section A: Recommended for You (Personalized, diverse max 2 per provider)
        recommended_for_you = []
        provider_counts = {}
        for item in scored_items:
            p_id = item["service"].provider_id
            if provider_counts.get(p_id, 0) < 2:
                recommended_for_you.append(serialize_service(item["service"]))
                provider_counts[p_id] = provider_counts.get(p_id, 0) + 1
                if len(recommended_for_you) >= 4:
                    break

        # Section B: Top Rated
        top_rated_items = sorted(candidates, key=lambda s: (s.rating, s.reviews_count), reverse=True)[:4]
        top_rated = [serialize_service(s) for s in top_rated_items]

        # Section C: Most Visited
        most_visited_items = sorted(candidates, key=lambda s: s.reviews_count, reverse=True)[:4]
        most_visited = [serialize_service(s) for s in most_visited_items]

        # Section D: Nearby / Near You
        near_you_items = [s for s in candidates if location and (location.lower() in s.location.lower() or location.lower() in s.district.lower())]
        if not near_you_items:
            near_you_items = candidates[:4]
        nearby = [serialize_service(s) for s in near_you_items[:4]]

        # Section E: Things to Visit (places, historical, farms, nature tours)
        visit_candidates = [
            s for s in candidates 
            if any(k in (s.category_slug or "").lower() or k in (s.category or "").lower() or k in (s.description or "").lower() 
                   for k in ["visit", "trail", "tour", "farm", "heritage", "historical", "nature"])
        ]
        if not visit_candidates:
            visit_candidates = candidates[:4]
        things_to_visit = [serialize_service(s) for s in visit_candidates[:4]]

        # Section F: Things to Do (hands-on activities, experiences, cooking, farming)
        do_candidates = [
            s for s in candidates 
            if any(k in (s.category_slug or "").lower() or k in (s.category or "").lower() or k in (s.description or "").lower() 
                   for k in ["experience", "activity", "activities", "workshop", "cooking", "learn", "craft"])
        ]
        if not do_candidates:
            do_candidates = candidates[:4]
        things_to_do = [serialize_service(s) for s in do_candidates[:4]]

        # Section G: Categories
        categories = [
            {"name": "Stays", "slug": "stay", "icon": "Home"},
            {"name": "Experiences", "slug": "experiences", "icon": "Sparkles"},
            {"name": "Food & Dining", "slug": "food", "icon": "Utensils"},
            {"name": "Events & Fairs", "slug": "events", "icon": "Calendar"},
        ]

        result = {
            "model_version": cls.MODEL_VERSION,
            "generated_at": datetime.utcnow().isoformat(),
            "recommended_for_you": recommended_for_you,
            "top_rated": top_rated,
            "most_visited": most_visited,
            "near_you": nearby,
            "nearby": nearby,
            "things_to_visit": things_to_visit,
            "things_to_do": things_to_do,
            "categories": categories,
        }

        # Cache in Redis (TTL 300 seconds)
        try:
            RedisService.set(cache_key, result, ttl_seconds=300)
        except Exception:
            pass

        return result

    @classmethod
    def get_explore_feed(
        cls,
        user: Optional[User],
        db: Session,
        location: Optional[str] = None,
        seed: Optional[int] = None,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """Fetch progressive Explore page discovery feed matching all 10 official categories.

        Implements:
        1. All 10 existing marketplace categories in randomized order.
        2. Personalization that learns over time from explicit preferences and interactions.
        3. 'Nearby Places' only when valid, reliable location data is provided.
        4. 'Because You Visited' based on real interaction/booking history (never invented).
        5. 'Top & Most Visited' based on real marketplace signals (reviews, ratings, bookings).
        6. 'Personalized For You' when sufficient preferences or interaction data exists.
        7. Cold-start handling for new users (no fake preferences).
        8. Progressive personalization ordering based on signals.
        """
        user_id = user.id if user else None

        # 1. Fetch all 10 official marketplace categories
        db_cats = (
            db.query(MarketplaceCategory)
            .filter(MarketplaceCategory.is_active == True)
            .order_by(MarketplaceCategory.sort_order.asc())
            .all()
        )
        category_list = [
            {
                "id": str(c.id),
                "slug": c.slug,
                "name": c.name,
                "icon": c.icon,
                "description": c.description,
                "sort_order": c.sort_order,
            }
            for c in db_cats
        ]

        # Randomize category order per session/seed/request
        if seed is not None:
            rng = random.Random(seed)
        elif user_id:
            h = int(hashlib.md5(f"{user_id}-{datetime.utcnow().strftime('%Y%m%d%H')}".encode()).hexdigest(), 16)
            rng = random.Random(h % 10000000)
        else:
            rng = random.Random()
        rng.shuffle(category_list)

        # 2. Location determination
        # Requirement 3 & 7: "After reliable location information is available... Do not claim a place is nearby without valid location data."
        user_location = location.strip() if (location and location.strip()) else None
        has_location = bool(user_location)

        # Redis Cache check (skip if force_refresh)
        cache_key = f"explore:feed:user:{user_id or 'guest'}:loc:{user_location or 'none'}"
        if not force_refresh:
            cached = RedisService.get(cache_key)
            if cached and isinstance(cached, dict):
                cached["categories"] = category_list
                return cached

        # 3. Detect User History & Signals
        user_interactions = (
            db.query(UserInteraction)
            .filter(UserInteraction.user_id == user_id)
            .order_by(UserInteraction.created_at.desc())
            .limit(100)
            .all()
            if user_id else []
        )
        saved_services = (
            db.query(SavedService)
            .filter(SavedService.user_id == user_id)
            .all()
            if user_id else []
        )
        bookings = (
            db.query(Booking)
            .filter(Booking.customer_id == user_id)
            .order_by(Booking.created_at.desc())
            .all()
            if user_id else []
        )

        has_history = bool(user_interactions or saved_services or bookings)
        total_signals = len(user_interactions) + len(saved_services) + len(bookings)

        # 4. Detect Explicit Travel Preferences
        raw_prefs = getattr(user, "travel_preferences", None) if user else None
        user_prefs = None
        if raw_prefs:
            if isinstance(raw_prefs, str):
                try:
                    user_prefs = json.loads(raw_prefs)
                except Exception:
                    user_prefs = None
            elif isinstance(raw_prefs, dict):
                user_prefs = raw_prefs

        has_preferences = bool(
            user_prefs and any(
                user_prefs.get(k) for k in [
                    "interests", "preferred_destinations", "preferred_activities", "budget_band"
                ]
            )
        )

        has_sufficient_personalization = (
            has_preferences or
            len(user_interactions) >= 3 or
            (len(saved_services) + len(bookings)) >= 1
        )
        is_cold_start = not has_history and not has_preferences

        # 5. Fetch eligible active services pool
        valid_provider_ids = set(
            u[0] for u in db.query(User.id).filter(User.is_active == True, User.is_verified == True).all()
        )
        all_published = (
            db.query(Service)
            .filter(
                Service.status == "PUBLISHED",
                Service.is_verified == True,
                Service.provider_id.in_(valid_provider_ids),
            )
            .all()
        )

        def serialize_service(s: Service) -> Dict[str, Any]:
            return {
                "id": str(s.id),
                "title": s.title,
                "slug": s.slug,
                "description": s.description,
                "category": s.category,
                "category_slug": s.category_slug,
                "location": s.location,
                "district": s.district,
                "state": s.state,
                "price": float(s.price) if s.price is not None else 0.0,
                "unit": s.unit,
                "rating": float(s.rating) if s.rating is not None else 5.0,
                "reviews_count": int(s.reviews_count) if s.reviews_count is not None else 0,
                "is_verified": bool(s.is_verified),
                "status": s.status,
                "provider_id": str(s.provider_id) if s.provider_id else None,
                "provider_name": s.provider_name,
                "provider_type": s.provider_type,
                "primary_image": s.primary_image,
                "formatted_address": getattr(s, "formatted_address", s.location),
            }

        # SECTION A: Nearby Places (Requires reliable location)
        nearby_places = None
        if has_location and user_location:
            loc_lower = user_location.lower()
            matching = [
                s for s in all_published
                if loc_lower in (s.district or "").lower() or loc_lower in (s.location or "").lower()
            ]
            matching.sort(key=lambda s: (float(s.rating or 0.0), int(s.reviews_count or 0)), reverse=True)
            if matching:
                nearby_places = [serialize_service(s) for s in matching[:6]]

        # SECTION B: Because You Visited (Requires real historical evidence)
        because_you_visited = None
        if has_history and user_id:
            anchor_service = None
            anchor_category = None
            anchor_district = None
            context_text = None

            # Priority 1: Completed or confirmed booking
            for b in bookings:
                if b.status in ["COMPLETED", "CONFIRMED"] and b.service_id:
                    s = next((x for x in all_published if x.id == b.service_id), None)
                    if s:
                        anchor_service = s
                        anchor_category = s.category_slug
                        anchor_district = s.district
                        context_text = f"Because you visited {s.title} in {s.district}"
                        break

            # Priority 2: Saved service
            if not anchor_service:
                for sv in saved_services:
                    s = next((x for x in all_published if x.id == sv.service_id), None)
                    if s:
                        anchor_service = s
                        anchor_category = s.category_slug
                        anchor_district = s.district
                        context_text = f"Because you saved {s.title} in {s.district}"
                        break

            # Priority 3: Viewed service interaction
            if not anchor_service:
                for inter in user_interactions:
                    if inter.service_id:
                        s = next((x for x in all_published if x.id == inter.service_id), None)
                        if s:
                            anchor_service = s
                            anchor_category = s.category_slug
                            anchor_district = s.district
                            context_text = f"Because you explored {s.title} in {s.district}"
                            break

            # Priority 4: Search or Category interaction
            if not anchor_service and user_interactions:
                for inter in user_interactions:
                    meta = {}
                    try:
                        meta = json.loads(inter.metadata_json or "{}") if isinstance(inter.metadata_json, str) else (inter.metadata_json or {})
                    except Exception:
                        meta = {}
                    cat = meta.get("category_slug") or meta.get("category")
                    q = meta.get("query")
                    dest = meta.get("district") or meta.get("location")
                    if cat or dest or q:
                        anchor_category = cat
                        anchor_district = dest
                        subject = cat or dest or q
                        context_text = f"Because you searched for {subject}"
                        break

            if context_text and (anchor_category or anchor_district or anchor_service):
                related = [
                    s for s in all_published
                    if (anchor_service is None or s.id != anchor_service.id)
                    and (
                        (anchor_category and s.category_slug == anchor_category) or
                        (anchor_district and anchor_district.lower() in (s.district or "").lower())
                    )
                ]
                related.sort(key=lambda s: (float(s.rating or 0.0), int(s.reviews_count or 0)), reverse=True)
                if related:
                    because_you_visited = {
                        "context": context_text,
                        "source_service_id": str(anchor_service.id) if anchor_service else None,
                        "source_title": anchor_service.title if anchor_service else None,
                        "items": [serialize_service(s) for s in related[:6]],
                    }

        # SECTION C: Personalized For You (Requires sufficient preferences or interactions)
        personalized_for_you = None
        if has_sufficient_personalization:
            profile = db.query(UserInterestProfile).filter(UserInterestProfile.user_id == user_id).first() if user_id else None
            user_vector = None
            if profile and profile.topic_affinity_json:
                try:
                    topics = " ".join(json.loads(profile.topic_affinity_json).keys())
                    user_vector = EmbeddingService.generate_embedding(topics)
                except Exception:
                    pass

            scoring_context = cls.build_user_scoring_context(db, user_id)
            scored_candidates = []
            for srv in all_published:
                score, reason = cls.calculate_final_score(
                    service=srv,
                    user_id=user_id,
                    profile=profile,
                    user_vector=user_vector,
                    db=db,
                    location=user_location,
                    context=scoring_context,
                )
                scored_candidates.append({
                    "service": srv,
                    "score": score,
                    "reason": reason,
                })

            scored_candidates.sort(key=lambda x: x["score"], reverse=True)

            pers_items = []
            provider_counts = {}
            for item in scored_candidates:
                p_id = item["service"].provider_id
                if provider_counts.get(p_id, 0) < 2:
                    serialized = serialize_service(item["service"])
                    serialized["recommendation_score"] = item["score"]
                    serialized["recommendation_reason"] = item["reason"]
                    pers_items.append(serialized)
                    provider_counts[p_id] = provider_counts.get(p_id, 0) + 1
                    if len(pers_items) >= 6:
                        break

            if pers_items:
                personalized_for_you = pers_items

        # SECTION D: Top & Most Visited (Always available, composite real metrics)
        def composite_popularity(s: Service) -> float:
            rc = int(s.reviews_count or 0)
            rt = float(s.rating or 0.0)
            return (rc * 2.0) + (rt * 4.0)

        top_candidates = sorted(all_published, key=composite_popularity, reverse=True)[:8]
        top_and_most_visited = [serialize_service(s) for s in top_candidates]

        # Progressive Section Ordering (Requirement 8)
        active_sections = ["categories"]
        if nearby_places and len(nearby_places) > 0:
            active_sections.append("nearby_places")
        if because_you_visited and because_you_visited.get("items"):
            active_sections.append("because_you_visited")
        if personalized_for_you and len(personalized_for_you) > 0:
            active_sections.append("personalized_for_you")
        active_sections.append("top_and_most_visited")

        result = {
            "model_version": cls.MODEL_VERSION,
            "generated_at": datetime.utcnow().isoformat(),
            "categories": category_list,
            "active_sections": active_sections,
            "nearby_places": nearby_places,
            "because_you_visited": because_you_visited,
            "personalized_for_you": personalized_for_you,
            "top_and_most_visited": top_and_most_visited,
            "user_signals": {
                "is_authenticated": bool(user_id),
                "has_location": has_location,
                "location": user_location,
                "has_history": has_history,
                "has_preferences": has_preferences,
                "interaction_count": total_signals,
                "is_cold_start": is_cold_start,
                "has_sufficient_personalization": has_sufficient_personalization,
            },
        }

        # Cache in Redis for 120s
        try:
            RedisService.set(cache_key, result, ttl_seconds=120)
        except Exception:
            pass

        return result
