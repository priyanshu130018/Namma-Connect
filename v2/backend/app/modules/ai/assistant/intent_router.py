"""Intent extraction and conversational routing."""

import re
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional


@dataclass
class ExtractedIntent:
    intent: str  # "GENERAL_CHAT", "MARKETPLACE_SEARCH", "RECOMMENDATION", "SERVICE_DETAILS", "AVAILABILITY_CHECK", "TRIP_PLANNER_HANDOFF"
    confidence: float = 0.9
    entities: Dict[str, Any] = field(default_factory=dict)


class IntentRouter:
    """Classifies user travel messages into structured intents and parameters."""

    DISTRICT_MAP = {
        "coorg": "Kodagu",
        "kodagu": "Kodagu",
        "madikeri": "Kodagu",
        "chikkamagaluru": "Chikkamagaluru",
        "chikmagalur": "Chikkamagaluru",
        "mudigere": "Chikkamagaluru",
        "mysuru": "Mysuru",
        "mysore": "Mysuru",
        "kabini": "Mysuru",
        "shivamogga": "Shivamogga",
        "shimoga": "Shivamogga",
        "thirthahalli": "Shivamogga",
        "uttara kannada": "Uttara Kannada",
        "gokarna": "Uttara Kannada",
        "dandeli": "Uttara Kannada",
        "hassan": "Hassan",
        "sakleshpur": "Hassan",
    }

    CATEGORY_MAP = {
        "stay": "farm-stays",
        "cottage": "farm-stays",
        "homestay": "farm-stays",
        "resort": "farm-stays",
        "tour": "agro-tours",
        "trail": "agro-tours",
        "walk": "agro-tours",
        "trek": "agro-tours",
        "activity": "agro-tours",
        "workshop": "workshops",
        "cooking": "workshops",
        "harvest": "agro-tours",
    }

    @classmethod
    def classify_intent(cls, message: str) -> ExtractedIntent:
        """Deterministically extract intent and entities from user query."""
        text = message.lower().strip()
        entities: Dict[str, Any] = {
            "destination_district": None,
            "category_slug": None,
            "max_budget": None,
            "dates": None,
            "party_size": None,
            "keywords": [],
        }

        # 1. Extract District
        for key, canonical in cls.DISTRICT_MAP.items():
            if key in text:
                entities["destination_district"] = canonical
                break

        # 2. Extract Category
        for key, slug in cls.CATEGORY_MAP.items():
            if key in text:
                entities["category_slug"] = slug
                break

        # 3. Extract Budget (e.g. under 4000, max 5000, 3000 rs)
        budget_match = re.search(r"(?:under|max|budget|below|₹|rs\.?)\s*(\d{3,6})", text)
        if budget_match:
            try:
                entities["max_budget"] = float(budget_match.group(1))
            except ValueError:
                pass

        # 4. Extract Party Size
        people_match = re.search(r"(\d+)\s*(?:people|persons|adults|guests|pax)", text)
        if people_match:
            try:
                entities["party_size"] = int(people_match.group(1))
            except ValueError:
                pass

        # 5. Classify Intent
        # Multi-day Trip Planning
        if any(w in text for w in ["itinerary", "day 1", "day 2", "3 days", "4 days", "2 days", "weekend trip", "plan my trip"]):
            return ExtractedIntent(
                intent="TRIP_PLANNER_HANDOFF",
                confidence=0.95,
                entities=entities,
            )

        # Availability Check
        if any(w in text for w in ["available", "availability", "open dates", "vacant", "slots", "book for tomorrow"]):
            return ExtractedIntent(
                intent="AVAILABILITY_CHECK",
                confidence=0.92,
                entities=entities,
            )

        # Recommendation
        if any(w in text for w in ["recommend", "suggest", "popular", "best places", "top rated", "what should i visit"]):
            return ExtractedIntent(
                intent="RECOMMENDATION",
                confidence=0.90,
                entities=entities,
            )

        # Marketplace Search
        if any(w in text for w in ["find", "search", "show me", "looking for", "stays in", "tours in", "near"]) or entities["destination_district"] or entities["category_slug"]:
            return ExtractedIntent(
                intent="MARKETPLACE_SEARCH",
                confidence=0.88,
                entities=entities,
            )

        # General Chat
        return ExtractedIntent(
            intent="GENERAL_CHAT",
            confidence=0.85,
            entities=entities,
        )
