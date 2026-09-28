"""Feature extraction and signal weighting for recommendation engine."""

import math
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.core.enums import InteractionEventType


class InteractionWeights:
    """Configurable weights for customer behavioral signals with exponential decay."""

    WEIGHTS: Dict[str, float] = {
        InteractionEventType.BOOK.value: 5.0,
        "BOOKING_COMPLETED": 5.0,
        "BOOKING_START": 3.0,
        InteractionEventType.SAVE.value: 3.0,
        InteractionEventType.ADD_TO_TRIP.value: 3.5,
        "REVIEW_SUBMIT": 2.5,
        "RATING_5": 2.5,
        "SEARCH_CLICK": 2.0,
        InteractionEventType.CLICK.value: 1.5,
        InteractionEventType.DETAIL_OPEN.value: 1.2,
        InteractionEventType.VIEW.value: 1.0,
        InteractionEventType.SHARE.value: 2.0,
        InteractionEventType.SEARCH.value: 1.0,
        InteractionEventType.DISMISS.value: -2.0,
        InteractionEventType.UNSAVE.value: 0.0,
    }

    HALF_LIFE_DAYS: float = 7.0
    DECAY_LAMBDA: float = math.log(2.0) / 7.0  # ~0.099021

    @classmethod
    def get_weight(cls, event_type: str) -> float:
        """Get the base weight for a given interaction event type."""
        normalized = str(event_type).upper().strip()
        return cls.WEIGHTS.get(normalized, 1.0)

    @classmethod
    def calculate_decayed_weight(cls, base_weight: float, created_at: Optional[datetime]) -> float:
        """Calculate exponential time-decay weight with 7-day half-life.
        
        Formula: weight * e^(-lambda * age_in_days)
        """
        if not created_at:
            return base_weight
        age_days = (datetime.utcnow() - created_at).total_seconds() / 86400.0
        if age_days < 0:
            age_days = 0.0
        return base_weight * math.exp(-cls.DECAY_LAMBDA * age_days)


class FeatureExtractor:
    """Extracts aggregate user affinities, preferences, and service features."""

    @staticmethod
    def extract_affinities_from_interactions(
        interactions: List[Any],
    ) -> Dict[str, Any]:
        """Aggregate interaction history into category, destination, and topic affinities."""
        category_weights: Dict[str, float] = {}
        destination_weights: Dict[str, float] = {}
        topic_weights: Dict[str, float] = {}
        total_weight = 0.0
        min_price = float("inf")
        max_price = 0.0

        for inter in interactions:
            event_type = getattr(inter, "event_type", "VIEW")
            base_weight = getattr(inter, "weight", 1.0) or InteractionWeights.get_weight(event_type)
            created_at = getattr(inter, "created_at", None)
            decayed = InteractionWeights.calculate_decayed_weight(base_weight, created_at)

            # Metadata parsing
            meta = {}
            raw_meta = getattr(inter, "metadata_json", None)
            if raw_meta:
                if isinstance(raw_meta, str):
                    try:
                        import json
                        meta = json.loads(raw_meta)
                    except Exception:
                        meta = {}
                elif isinstance(raw_meta, dict):
                    meta = raw_meta

            # Category affinity
            cat = meta.get("category_slug") or meta.get("category")
            if cat:
                cat_key = str(cat).lower().strip()
                category_weights[cat_key] = category_weights.get(cat_key, 0.0) + decayed

            # Destination affinity
            dest = meta.get("district") or meta.get("location")
            if dest:
                dest_key = str(dest).lower().strip()
                destination_weights[dest_key] = destination_weights.get(dest_key, 0.0) + decayed

            # Topic affinity (e.g. coffee, trekking, waterfall)
            topics = meta.get("topics", [])
            if isinstance(topics, list):
                for t in topics:
                    t_key = str(t).lower().strip()
                    topic_weights[t_key] = topic_weights.get(t_key, 0.0) + decayed

            # Budget observation
            price = meta.get("price")
            if price is not None:
                try:
                    p = float(price)
                    if p > 0:
                        min_price = min(min_price, p)
                        max_price = max(max_price, p)
                except (ValueError, TypeError):
                    pass

            total_weight += max(0.0, decayed)

        # Normalize category affinities
        total_cat = sum(category_weights.values())
        if total_cat > 0:
            category_affinities = {k: round(v / total_cat, 4) for k, v in category_weights.items()}
        else:
            category_affinities = {}

        # Normalize destination affinities
        total_dest = sum(destination_weights.values())
        if total_dest > 0:
            destination_affinities = {k: round(v / total_dest, 4) for k, v in destination_weights.items()}
        else:
            destination_affinities = {}

        # Normalize topic affinities
        total_topic = sum(topic_weights.values())
        if total_topic > 0:
            topic_affinities = {k: round(v / total_topic, 4) for k, v in topic_weights.items()}
        else:
            topic_affinities = {}

        # Interest confidence: bounded between 0.0 and 1.0 based on interaction volume
        confidence = min(1.0, round(len(interactions) / 10.0, 2))
        interest_score = min(100.0, round(total_weight * 10.0, 2))

        budget_band = {
            "min": int(min_price) if min_price != float("inf") else 500,
            "max": int(max_price) if max_price > 0 else 10000,
        }

        return {
            "category_affinity": category_affinities,
            "destination_affinity": destination_affinities,
            "topic_affinity": topic_affinities,
            "budget_band": budget_band,
            "interest_score": interest_score,
            "confidence_score": confidence,
            "interaction_count": len(interactions),
        }
