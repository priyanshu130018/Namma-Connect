"""Google Gemini AI Service for NammaConnect V2 (Travel AI & Support AI)."""

import json
import urllib.request
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logging import logger
from app.repositories.service import ServiceRepository


class GeminiService:
    """Integration with Google Gemini API for intelligent trip planning and grounded customer support."""

    # In-memory conversation turn cache: conv_id -> {"history": list, "context": dict}
    _conversations: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def is_configured(cls) -> bool:
        return bool(settings.GEMINI_API_KEY)

    @classmethod
    def detect_input_language(cls, prompt: str, explicit_language: Optional[str] = None) -> str:
        """
        Detect user language from script and Romanized markers, or fall back to explicit param.
        Returns 'kn' for Kannada, 'hi' for Hindi, and 'en' for English.
        """
        import re
        if not prompt or not prompt.strip():
            return (explicit_language or "en").lower().strip()

        # 1. Check Unicode script
        if re.search(r'[\u0C80-\u0CFF]', prompt):
            return "kn"
        if re.search(r'[\u0900-\u097F]', prompt):
            return "hi"

        # 2. Check Romanized Kannada & Hindi vocabulary
        p_lower = prompt.lower()
        words = set(re.findall(r'[a-z]+', p_lower))

        roman_kannada = {
            "nanage", "namage", "beku", "alli", "thota", "thotada", "oota", "yaavudu",
            "hege", "yelli", "nodabekenta", "madona", "kannada", "namaskara", "kodagu"
        }
        if words & roman_kannada:
            return "kn"

        roman_hindi = {
            "mujhe", "chahiye", "humein", "kripya", "karna", "kaunsa", "kaha", "bataiye",
            "namaste", "dost", "kaise", "apka", "mera", "hoga"
        }
        if words & roman_hindi or ("mein" in words and any(w in words for w in ["coffee", "farm", "stay", "experience", "trip", "tour"])):
            return "hi"

        # 3. Explicit language param
        if explicit_language:
            exp = explicit_language.lower().strip()
            if exp in ["kn", "kannada"]:
                return "kn"
            if exp in ["hi", "hindi"]:
                return "hi"

        return "en"

    @classmethod
    def has_recommendation_intent(
        cls,
        prompt: str,
        destination: Optional[str] = None,
        category: Optional[str] = None,
    ) -> bool:
        """
        Lightweight recommendation-intent decision before running service retrieval.
        Returns False for conversational messages such as greetings, pleasantries, gratitude,
        and general small talk that do not ask to discover/recommend/search/book services.
        Returns True when the user clearly asks for recommendations, search, activities, stays, or events.
        """
        if not prompt or not prompt.strip():
            return False

        # If explicit destination or category filters were supplied in the request payload
        if destination or category:
            return True

        p_lower = prompt.lower().strip()
        import re

        words = set(re.findall(r'[\w\u0C80-\u0CFF\u0900-\u097F]+', p_lower))
        if not words:
            return False

        # Explicit recommendation, search, discovery, and booking action words
        DISCOVERY_KEYWORDS = {
            "recommend", "recommendation", "recommendations", "suggest", "suggestion", "suggestions",
            "find", "search", "show", "options", "list", "explore", "discover", "book", "booking",
            "reserve", "reserving", "cost", "price", "budget", "rates",
            # Lodging / Stays
            "stay", "stays", "homestay", "homestays", "farmstay", "farmstays", "resort", "resorts",
            "cottage", "cottages", "bungalow", "bungalows", "tent", "tents", "camp", "camping",
            # Farm / Agriculture
            "farm", "farms", "farming", "plantation", "plantations", "estate", "estates", "orchard",
            "orchards", "agriculture", "agro", "agritourism",
            # Crops & Produce
            "coffee", "tea", "spice", "spices", "pepper", "cardamom", "areca", "arecanut", "paddy",
            "rice", "sugarcane", "jaggery", "vanilla", "honey", "bee", "beekeeping", "organic", "harvest",
            # Activities & Events
            "pottery", "clay", "workshop", "workshops", "experience", "experiences", "activity", "activities",
            "fair", "fairs", "festival", "festivals", "mela", "jatre", "jatra", "habba", "sante",
            "event", "events", "celebration", "exhibition",
            # Tours & Trails
            "tour", "tours", "guide", "guides", "guided", "trail", "trails", "trek", "treks",
            "safari", "walk", "walks", "cupping", "roasting",
            # Food & Culinary
            "food", "dining", "cuisine", "feast", "kitchen", "cook", "cooking", "meal", "lunch",
            "dinner", "breakfast", "thali", "oota",
            # Travel & Packages
            "itinerary", "package", "trip", "packages",
            # Multilingual Kannada terms
            "ತೋಟ", "ತೋಟದ", "ತೋಟಗಳು", "ಕಾಫಿ", "ಚಹಾ", "ಕೃಷಿ", "ವಾಸ್ತವ್ಯ", "ಪ್ರವಾಸ", "ಕೊಯ್ಲು", "ಜೇನು",
            "ಕುಂಬಾರಿಕೆ", "ಮಣ್ಣಿನ", "ಊಟ", "ಜಾತ್ರೆ", "ಸಂತೆ", "ಹಬ್ಬ", "ಹೋಮ್‌ಸ್ಟೇ", "ಬೇಕಿದೆ", "ಬೇಕು",
            "ಎಲ್ಲಿ", "ತಾಣಗಳು", "ನೋಡಲು", "ವಾಸ", "ಸ್ಟೇ", "ಆಹಾರ", "ಕಾರ್ಯಾಗಾರ",
            # Romanized Kannada terms
            "thota", "thotada", "beku", "nodabekenta", "yelli", "jaatre", "sante", "madona", "krishi",
            # Multilingual Hindi terms
            "फार्म", "खेत", "खेती", "कॉफी", "चाय", "स्टे", "सफर", "कटाई", "शहद", "मेला", "त्योहार",
            "चाहिए", "कहाँ", "कहा", "घूमने", "जगह", "पर्यटन", "कार्यशाला",
            # Romanized Hindi terms
            "chahiye", "kaunsa", "kaha", "bataiye", "ghoomne", "jagah",
        }

        # Multi-word intent phrases
        INTENT_PHRASES = [
            "near me", "places to visit", "places to go", "where can i", "where to", "things to do",
            "what to see", "how to book", "plan a trip", "plan my trip", "day trip", "weekend trip",
            "look for", "looking for", "under ₹", "under rs", "below ₹", "below rs"
        ]

        if any(phrase in p_lower for phrase in INTENT_PHRASES):
            return True

        # Region/destinations in Karnataka (inquiry about destination)
        REGIONS = [
            "coorg", "kodagu", "wayanad", "chikmagalur", "chikkamagaluru", "mandya", "mysore", "mysuru",
            "hampi", "kabini", "sakleshpur", "uttara kannada", "sirsi", "dakshina kannada", "mangalore",
            "mangaluru", "shimoga", "shivamogga", "udupi", "gokarna", "dandeli"
        ]
        if any(reg in p_lower for reg in REGIONS):
            return True

        # Check single keyword intersection
        if words & DISCOVERY_KEYWORDS:
            return True

        return False

    @classmethod
    def generate_travel_plan(
        cls,
        db: Session,
        prompt: str,
        conversation_id: Optional[str] = None,
        destination: Optional[str] = None,
        category: Optional[str] = None,
        language: Optional[str] = "en",
    ) -> Dict[str, Any]:
        """Generate travel recommendations strictly grounded in real marketplace services with multi-turn context."""
        conv_id = conversation_id or "default-conv"
        if conv_id not in cls._conversations:
            cls._conversations[conv_id] = {"history": [], "accumulated_context": {}}

        session_data = cls._conversations[conv_id]
        accumulated = session_data["accumulated_context"]

        lang_code = cls.detect_input_language(prompt, language)
        logger.info(
            f"AI request received | conversation_id={conv_id} | language={lang_code} | message_length={len(prompt)}"
        )

        prompt_lower = prompt.lower().strip()

        # Extract & accumulate context across turns
        for region in ["coorg", "kodagu", "wayanad", "chikmagalur", "chikkamagaluru", "mandya", "mysore", "mysuru", "hampi", "kabini", "sakleshpur", "uttara kannada", "sirsi", "dakshina kannada", "mangalore", "mangaluru", "shimoga", "shivamogga", "udupi"]:
            if region in prompt_lower:
                accumulated["destination"] = region.title()
                break

        for cat_keyword, cat_val in [("stay", "Stay"), ("food", "Food"), ("tour", "Guides & Tours"), ("experience", "Experiences"), ("harvest", "Experiences")]:
            if cat_keyword in prompt_lower:
                accumulated["category"] = cat_val
                break

        # Extract budget if mentioned (e.g. 2000, 3000, 5000)
        import re
        budget_match = re.search(r'(?:under|below|budget|₹|rs\.?)\s*(\d{3,6})', prompt_lower)
        if budget_match:
            try:
                accumulated["max_budget"] = float(budget_match.group(1))
            except Exception:
                pass

        # Extract duration if mentioned (e.g. 3 day, 2 days, weekend)
        duration_match = re.search(r'(\d+)\s*(?:day|days|night|nights)', prompt_lower)
        if duration_match:
            accumulated["duration_days"] = int(duration_match.group(1))

        effective_dest = destination or accumulated.get("destination")
        effective_cat = category or accumulated.get("category")
        effective_budget = accumulated.get("max_budget")

        # Critical behavior: skip recommendation retrieval for conversational messages
        if not cls.has_recommendation_intent(prompt, effective_dest, effective_cat):
            logger.info(f"Conversational message without recommendation intent: '{prompt}'")
            session_data["history"].append({"user": prompt})

            is_greeting = any(g in prompt_lower for g in ["hello", "hi", "hey", "namaskara", "namaste", "namaskar", "greetings", "good morning", "good evening", "good afternoon"])
            is_thanks = any(t in prompt_lower for t in ["thank", "thanks", "dhanyavada", "dhanyavadagalu", "shukriya"])
            is_how_are_you = any(h in prompt_lower for h in ["how are you", "how r u", "how do you do"])

            if is_greeting:
                if lang_code == "kn":
                    reply = (
                        "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ನಮ್ಮ AI (Namma AI) ಪ್ರಯಾಣ ಸಹಾಯಕ. "
                        "ಕೊಡಗಿನ ಕಾಫಿ ತೋಟಗಳು, ಮಂಡ್ಯದ ಕೃಷಿ ಕಾರ್ಯಾಗಾರಗಳು ಅಥವಾ ಪಶ್ಚಿಮ ಘಟ್ಟಗಳ ರಮಣೀಯ ತಾಣಗಳ ಪ್ರವಾಸವನ್ನು ಯೋಜಿಸಲು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?"
                    )
                elif lang_code == "hi":
                    reply = (
                        "नमस्ते! मैं आपका Namma AI यात्रा सहायक हूँ। "
                        "कूर्ग में कॉफी एस्टेट स्टे, मांड्या में कृषि कार्यशालाओं, या सप्ताहांत पर्यटन की योजना बनाने में मैं आपकी क्या मदद कर सकता हूँ?"
                    )
                else:
                    reply = (
                        "Namaskara! I am Namma AI, your personal Karnataka travel assistant. "
                        "I can help you discover certified coffee plantation stays, organic harvest workshops, or customized itineraries across Karnataka. Where would you like to explore?"
                    )
            elif is_thanks:
                if lang_code == "kn":
                    reply = "ಧನ್ಯವಾದಗಳು! ಕರ್ನಾಟಕದ ಕೃಷಿ ಪ್ರವಾಸೋದ್ಯಮ ಮತ್ತು ಗ್ರಾಮೀಣ ಅನುಭವಗಳ ಬಗ್ಗೆ ನೀವು ಯಾವಾಗ ಬೇಕಾದರೂ ನನ್ನನ್ನು ಕೇಳಬಹುದು."
                elif lang_code == "hi":
                    reply = "आपका स्वागत है! जब भी आप कर्नाटक के कृषि पर्यटन या ग्रामीण अनुभवों को खोजना चाहें, बेझिझक पूछें।"
                else:
                    reply = "You're welcome! Let me know whenever you would like to explore farm stays, agro-tours, or rural experiences across Karnataka."
            elif is_how_are_you:
                if lang_code == "kn":
                    reply = "ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ, ಧನ್ಯವಾದಗಳು! ಕರ್ನಾಟಕದ ಗ್ರಾಮೀಣ ತಾಣಗಳು ಮತ್ತು ಕೃಷಿ ಪ್ರವಾಸಗಳನ್ನು ಅನ್ವೇಷಿಸಲು ನೀವು ಸಿದ್ಧರಿದ್ದೀರಾ?"
                elif lang_code == "hi":
                    reply = "मैं ठीक हूँ, पूछने के लिए धन्यवाद! कर्नाटक के फार्म स्टे और ग्रामीण पर्यटन को खोजने के लिए क्या आप तैयार हैं?"
                else:
                    reply = "I'm doing great, thank you! I am ready to help you plan farm stays, harvest experiences, and rural tours across Karnataka. What would you like to explore?"
            else:
                if lang_code == "kn":
                    reply = (
                        "ನಾನು ನಮ್ಮ AI, ನಿಮ್ಮ ಕರ್ನಾಟಕ ಗ್ರಾಮೀಣ ಪ್ರವಾಸ ಸಹಾಯಕ. "
                        "ಕಾಫಿ ತೋಟದ ವಾಸ್ತವ್ಯ, ಸಾವಯವ ಕೃಷಿ ಕಾರ್ಯಾಗಾರ ಅಥವಾ ಸ್ಥಳೀಯ ಹಳ್ಳಿಯ ಸಂತೆಯಂತಹ ಅನುಭವಗಳನ್ನು ಹುಡುಕಲು ನೀವು ನನ್ನನ್ನು ಕೇಳಬಹುದು."
                    )
                elif lang_code == "hi":
                    reply = (
                        "मैं Namma AI हूँ, आपका कर्नाटक ग्रामीण यात्रा सहायक। "
                        "कॉफी बागान स्टे, जैविक फार्म कार्यशाला या ग्रामीण मेलों के अनुभव खोजने के लिए आप मुझसे पूछ सकते हैं।"
                    )
                else:
                    reply = (
                        "I am Namma AI, your Karnataka rural travel and agro-tourism assistant. "
                        "You can ask me to discover coffee plantation stays, tea farm experiences, seasonal harvest fairs, or rural workshops across Karnataka!"
                    )

            if cls.is_configured():
                try:
                    lang_instruction = "Respond in English."
                    if lang_code == "kn":
                        lang_instruction = "Respond strictly in Kannada (ಕನ್ನಡ)."
                    elif lang_code == "hi":
                        lang_instruction = "Respond strictly in Hindi (हिन्दी)."

                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={settings.GEMINI_API_KEY}"
                    system_instruction = (
                        f"You are Namma AI, a friendly personal Karnataka travel assistant. {lang_instruction} "
                        "Respond politely and conversationally to the user's greeting or message. "
                        "Briefly introduce your capability to help explore and book rural Karnataka farm stays, plantation tours, organic workshops, and local experiences. "
                        "Do NOT list specific services or invent listings unless the user asks for recommendations."
                    )
                    req_body = {
                        "contents": [
                            {"parts": [{"text": f"{system_instruction}\n\nUser Message: {prompt}"}]}
                        ]
                    }
                    headers = {"Content-Type": "application/json"}
                    req = urllib.request.Request(
                        url,
                        data=json.dumps(req_body).encode("utf-8"),
                        headers=headers,
                        method="POST",
                    )
                    with urllib.request.urlopen(req, timeout=3) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                        reply = data["candidates"][0]["content"]["parts"][0]["text"]
                except Exception:
                    pass

            session_data["history"][-1]["ai"] = reply
            return {
                "reply": reply,
                "recommended_services": [],
                "source": "grounded_catalog",
                "diagnostics": {
                    "intent": "conversational",
                    "candidate_count": 0,
                    "final_count": 0,
                    "results": [],
                },
            }

        from app.services.search import SemanticSearchService

        candidate_k = getattr(settings, "RECOMMENDATION_CANDIDATE_K", 20)
        final_k = getattr(settings, "RECOMMENDATION_FINAL_K", 5)
        min_sim = getattr(settings, "MIN_RECOMMENDATION_SIMILARITY", 0.16)

        recommended_entities, diagnostics = SemanticSearchService.recommend_services(
            db,
            query=prompt,
            destination=effective_dest,
            category=effective_cat,
            max_budget=effective_budget,
            candidate_k=candidate_k,
            final_k=final_k,
            min_similarity=min_sim,
        )

        # If no services match the relevance threshold, return explicit no-match
        if not recommended_entities:
            if lang_code == "kn":
                no_match_msg = (
                    "ಕ್ಷಮಿಸಿ, ಲಭ್ಯವಿರುವ ಕರ್ನಾಟಕದ ಕೃಷಿ ಮತ್ತು ಗ್ರಾಮೀಣ ಪ್ರವಾಸೋದ್ಯಮ ಪಟ್ಟಿಯಲ್ಲಿ ನಿಮ್ಮ ಕೋರಿಕೆಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಯಾವುದೇ ಅನುಭವ ದೊರೆಯಲಿಲ್ಲ. "
                    "ದಯವಿಟ್ಟು ಕೊಡಗಿನ ಕಾಫಿ ತೋಟಗಳು, ಚಿಕ್ಕಮಗಳೂರಿನ ಚಹಾ ಎಸ್ಟೇಟ್‌ಗಳು ಅಥವಾ ಮಂಡ್ಯದ ಸಾವಯವ ಕೃಷಿ ಕಾರ್ಯಾಗಾರಗಳಂತಹ ನಮ್ಮ ಪರಿಶೀಲಿಸಿದ ಪಟ್ಟಿಗಳನ್ನು ಹುಡುಕಿ ನೋಡಿ."
                )
            elif lang_code == "hi":
                no_match_msg = (
                    "क्षमा करें, उपलब्ध कर्नाटक कृषि और ग्रामीण पर्यटन सूची में आपके अनुरोध से मेल खाने वाला कोई अनुभव नहीं मिला। "
                    "कृपया कूर्ग के कॉफी एस्टेट, चिकमगलूर के होमस्टे या मांड्या की जैविक फार्म कार्यशालाओं जैसी सत्यापित सूचियों को खोजें।"
                )
            else:
                no_match_msg = (
                    "I couldn't find a matching experience in the available listings across Karnataka. "
                    "You can explore verified coffee estate stays in Coorg, tea plantations in Chikmagalur, or organic farming workshops in Mandya."
                )
            return {
                "reply": no_match_msg,
                "recommended_services": [],
                "source": "grounded_catalog",
                "diagnostics": diagnostics,
            }

        service_catalog = [
            {
                "id": str(s.id),
                "title": s.title,
                "category": s.category,
                "location": s.location,
                "district": s.district,
                "state": s.state,
                "price": float(s.price),
                "unit": s.unit,
                "rating": float(s.rating),
            }
            for s in recommended_entities
        ]

        # Recommendation diversity & de-duplication
        previously_recommended: set = session_data.setdefault("recommended_ids", set())
        
        # Prioritize unseen services with unique titles/locations
        seen_titles = set()
        unseen_candidates = []
        repeat_candidates = []

        for s in service_catalog:
            title_key = f"{s['title'].strip().lower()}_{s['location'].strip().lower()}"
            if title_key in seen_titles:
                continue
            seen_titles.add(title_key)
            if s["id"] not in previously_recommended:
                unseen_candidates.append(s)
            else:
                repeat_candidates.append(s)

        diversified_catalog = unseen_candidates + repeat_candidates
        selected_candidates = diversified_catalog[:final_k] if diversified_catalog else service_catalog[:final_k]

        # Record recommended IDs in session
        for s in selected_candidates:
            previously_recommended.add(s["id"])

        lang_instruction = "Respond in English."
        if lang_code == "kn" or "kannada" in lang_code:
            lang_instruction = "Respond strictly in Kannada (ಕನ್ನಡ) unless requested otherwise."
        elif lang_code == "hi" or "hindi" in lang_code:
            lang_instruction = "Respond strictly in Hindi (हिन्दी) unless requested otherwise."

        # Attempt Gemini API
        if cls.is_configured() and selected_candidates:
            for model_name in ["models/gemma-4-26b-a4b-it", "models/gemini-flash-latest"]:
                try:
                    logger.info(f"Gemini request started for conversation {conv_id} using {model_name}...")
                    url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
                    system_instruction = (
                        f"You are Namma AI, your personal Karnataka travel assistant. {lang_instruction} "
                        "Recommend ONLY from the provided verified service catalog. "
                        "Only recommend services supplied in the retrieved service context. "
                        "Never invent prices, locations, ratings, or service IDs; always use the exact details from the catalog. "
                        "If the retrieved services do not satisfy the user's request, say that no suitable matching service was found. "
                        "Direct users to the Booking button for reserving."
                    )
                    req_body = {
                        "contents": [
                            {
                                "parts": [
                                    {
                                        "text": (
                                            f"{system_instruction}\n\n"
                                            f"Accumulated Context: {json.dumps(accumulated)}\n\n"
                                            f"Verified Service Catalog:\n{json.dumps(selected_candidates)}\n\n"
                                            f"User Query: {prompt}"
                                        )
                                    }
                                ]
                            }
                        ]
                    }
                    headers = {"Content-Type": "application/json"}
                    req = urllib.request.Request(
                        url,
                        data=json.dumps(req_body).encode("utf-8"),
                        headers=headers,
                        method="POST",
                    )
                    with urllib.request.urlopen(req, timeout=3) as resp:
                        logger.info("Gemini response received successfully.")
                        data = json.loads(resp.read().decode("utf-8"))
                        text_reply = data["candidates"][0]["content"]["parts"][0]["text"]
                        session_data["history"].append({"user": prompt, "ai": text_reply})
                        return {
                            "reply": text_reply,
                            "recommended_services": selected_candidates,
                            "source": "gemini_api",
                            "diagnostics": diagnostics,
                        }
                except Exception as e:
                    logger.warning(f"Model {model_name} call failed: {e}. Trying next...")

        # Grounded multi-turn rule engine fallback
        selected = selected_candidates[:3]

        is_greeting = any(g in prompt_lower for g in ["hello", "hi", "hey", "namaskara", "namaste"])
        is_weather = any(w in prompt_lower for w in ["weather", "climate", "monsoon", "rain", "season", "temperature", "ಹವಾಮಾನ", "मौसम"])
        is_itinerary = any(i in prompt_lower for i in ["plan", "itinerary", "day", "days", "trip", "weekend", "ಯೋಜನೆ", "प्लान"])

        if is_greeting and len(prompt.split()) <= 3:
            if lang_code == "kn":
                reply = (
                    "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ನಮ್ಮ AI (Namma AI) ಪ್ರಯಾಣ ಸಹಾಯಕ. "
                    "ಕೊಡಗಿನ ಕಾಫಿ ತೋಟಗಳು, ಮಂಡ್ಯದ ಕೃಷಿ ಕಾರ್ಯಾಗಾರಗಳು ಅಥವಾ ಪಶ್ಚಿಮ ಘಟ್ಟಗಳ ರಮಣೀಯ ತಾಣಗಳ ಪ್ರವಾಸವನ್ನು ಯೋಜಿಸಲು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?"
                )
            elif lang_code == "hi":
                reply = (
                    "नमस्ते! मैं आपका Namma AI यात्रा सहायक हूँ। "
                    "कूर्ग में कॉफी एस्टेट स्टे, मांड्या में कृषि कार्यशालाओं, या सप्ताहांत पर्यटन की योजना बनाने में मैं आपकी क्या मदद कर सकता हूँ?"
                )
            else:
                reply = (
                    "Namaskara! I am Namma AI, your personal Karnataka travel assistant. "
                    "I can help you discover certified coffee plantation stays, organic harvest workshops, or customized itineraries across Karnataka. Where would you like to explore?"
                )
            return {"reply": reply, "recommended_services": selected, "source": "grounded_catalog", "diagnostics": diagnostics}

        if is_weather:
            if lang_code == "kn":
                reply = (
                    "ಕರ್ನಾಟಕದ ಹವಾಮಾನ ಮಾರ್ಗದರ್ಶಿ:\n"
                    "• **ಪಶ್ಚಿಮ ಘಟ್ಟಗಳು (ಕೊಡಗು, ಚಿಕ್ಕಮಗಳೂರು):** ಜೂನ್-ಸೆಪ್ಟೆಂಬರ್ ಮಳೆಗಾಲದಲ್ಲಿ ಹಚ್ಚ ಹಸಿರು; ಅಕ್ಟೋಬರ್-ಮಾರ್ಚ್ ತಂಪಾದ ಆಹ್ಲಾದಕರ ವಾತಾವರಣ (18°C-24°C).\n"
                    "• **ದಕ್ಷಿಣ ಬಯಲು ಪ್ರದೇಶ (ಮಂಡ್ಯ, ಮೈಸೂರು):** ವರ್ಷವಿಡೀ ಕೃಷಿ ಪ್ರವಾಸಕ್ಕೆ ಸೂಕ್ತ, ನವೆಂಬರ್-ಫೆಬ್ರವರಿ ಅತ್ಯಂತ ಆಹ್ಲಾದಕರ.\n\n"
                    "ಕೃಷಿ ಪ್ರವಾಸೋದ್ಯಮಕ್ಕೆ ಶಿಫಾರಸು ಮಾಡಿದ ತಾಣಗಳು ಇಲ್ಲಿವೆ:"
                )
            elif lang_code == "hi":
                reply = (
                    "कर्नाटक मौसम और यात्रा गाइड:\n"
                    "• **पश्चिमी घाट (कूर्ग, चिकमगलूर):** जून-सितंबर मानसून में हरी-भरी वादियाँ; अक्टूबर-मार्च सुहावना और ठंडा मौसम (18°C-24°C).\n"
                    "• **दक्षिणी मैदान (मांड्या, मैसूर):** साल भर फार्म टूर के लिए बेहतरीन, नवंबर-फरवरी सबसे सुखद.\n\n"
                    "यहाँ सत्यापित कृषि पर्यटन स्टे उपलब्ध हैं:"
                )
            else:
                reply = (
                    "Karnataka Agro-Tourism Weather Guide:\n"
                    "• **Western Ghats (Coorg, Chikkamagaluru):** Lush monsoons from June to September; crisp, refreshing weather from October to March (18°C–24°C).\n"
                    "• **Southern Plains (Mandya, Mysuru):** Great year-round for organic farm tours, especially during winter harvests (November–February).\n\n"
                    "Here are verified recommendations matching this season:"
                )
            lines = [reply, ""]
            for s in selected:
                lines.append(f"- **{s['title']}** in {s['location']} &bull; ₹{s['price']:,.0f}/{s['unit']}")
            return {"reply": "\n".join(lines), "recommended_services": selected, "source": "grounded_catalog", "diagnostics": diagnostics}

        if is_itinerary and accumulated.get("duration_days"):
            days = accumulated["duration_days"]
            dest_name = effective_dest or "Karnataka"
            if lang_code == "kn":
                lines = [
                    f"{dest_name} ನಲ್ಲಿ {days}-ದಿನಗಳ ಕೃಷಿ ಪ್ರವಾಸ ಯೋಜನೆ:",
                    f"• **ದಿನ 1:** ತೋಟದ ವಾಸ್ತವ್ಯಕ್ಕೆ ಆಗಮನ, ತಾಜಾ ಸಾಂಪ್ರದಾಯಿಕ ಊಟ ಮತ್ತು ಕಾಫಿ/ಏಲಕ್ಕಿ ತೋಟದ ನಡಿಗೆ.",
                    f"• **ದಿನ 2:** ಸಾವಯವ ಕೊಯ್ಲು ಕಾರ್ಯಾಗಾರ, ಸ್ಥಳೀಯ ಜೇನುತುಪ್ಪ ಸಂಸ್ಕರಣೆ ಮತ್ತು ಹಳ್ಳಿಯ ನಿಸರ್ಗ ನಡಿಗೆ.",
                ]
                if days >= 3:
                    lines.append("• **ದಿನ 3:** ಸಾಂಪ್ರದಾಯಿಕ ಮಣ್ಣಿನ ಪಾತ್ರೆ ತಯಾರಿಕೆ, ಸ್ಥಳೀಯ ಹಳ್ಳಿಯ ಸಂತೆ ಮತ್ತು ವಾಪಸಾತಿ.")
                lines.append("")
                lines.append("ಪರಿಶೀಲಿಸಿದ ಶಿಫಾರಸುಗಳು:")
            elif lang_code == "hi":
                lines = [
                    f"{dest_name} में {days}-दिवसीय कृषि पर्यटन यात्रा योजना:",
                    f"• **दिन 1:** फार्म स्टे में चेक-इन, पारंपरिक भोजन और वृक्षारोपण वॉक.",
                    f"• **दिन 2:** जैविक फसल कार्यशाला, स्थानीय शहद निष्कर्षण और सूर्यास्त दृश्य.",
                ]
                if days >= 3:
                    lines.append("• **दिन 3:** मिट्टी के बर्तन कार्यशाला, स्थानीय ग्रामीण बाज़ार और प्रस्थान.")
                lines.append("")
                lines.append("सत्यापित सिफारिशें:")
            else:
                lines = [
                    f"{days}-Day Agritourism Itinerary for {dest_name}:",
                    f"• **Day 1:** Check-in at certified plantation stay, estate walk & farm-to-table lunch.",
                    f"• **Day 2:** Hands-on harvest workshop, honey extraction demo & evening stream trail.",
                ]
                if days >= 3:
                    lines.append("• **Day 3:** Artisanal pottery workshop, local village market visit & departure.")
                lines.append("")
                lines.append("Verified stays and tours for this itinerary:")

            for s in selected:
                lines.append(f"- **{s['title']}** in {s['location']} &bull; ₹{s['price']:,.0f}/{s['unit']}")
            return {"reply": "\n".join(lines), "recommended_services": selected, "source": "grounded_catalog", "diagnostics": diagnostics}

        if lang_code == "kn" or "kannada" in lang_code:
            reply_lines = [
                "ನಿಮ್ಮ ಪ್ರವಾಸದ ಆಸಕ್ತಿಯ ಆಧಾರದ ಮೇಲೆ, ಕರ್ನಾಟಕದ ಪರಿಶೀಲಿಸಿದ ಕೃಷಿ ಪ್ರವಾಸೋದ್ಯಮ ಶಿಫಾರಸುಗಳು ಇಲ್ಲಿವೆ:",
                "",
            ]
            for s in selected:
                reply_lines.append(
                    f"- **{s['title']}** - {s['location']} ({s['category']}) &bull; ₹{s['price']:,.0f}/{s['unit']}"
                )
            reply_lines.append("")
            reply_lines.append("ನೀವು ಈ ಯಾವುದೇ ಸೇವೆಗಳನ್ನು ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ನೇರವಾಗಿ ಕಾಯ್ದಿರಿಸಬಹುದು.")
        elif lang_code == "hi" or "hindi" in lang_code:
            reply_lines = [
                "आपकी यात्रा रुचि के आधार पर, कर्नाटक में सत्यापित कृषि पर्यटन सिफारिशें यहाँ हैं:",
                "",
            ]
            for s in selected:
                reply_lines.append(
                    f"- **{s['title']}** - {s['location']} ({s['category']}) &bull; ₹{s['price']:,.0f}/{s['unit']}"
                )
            reply_lines.append("")
            reply_lines.append("आप बाज़ार के माध्यम से इनमें से किसी को भी सीधे आरक्षित कर सकते हैं।")
        else:
            reply_lines = [
                "Based on your travel interest, here are verified agritourism recommendations in Karnataka:",
                "",
            ]
            for s in selected:
                reply_lines.append(
                    f"- **{s['title']}** in {s['location']} ({s['category']}) &bull; ₹{s['price']:,.0f}/{s['unit']}"
                )
            reply_lines.append("")
            reply_lines.append(
                "You can view listing details and reserve any of these directly through the marketplace."
            )

        return {
            "reply": "\n".join(reply_lines),
            "recommended_services": selected,
            "source": "grounded_catalog",
            "diagnostics": diagnostics,
        }

    @classmethod
    def answer_support_query(
        cls,
        user_query: str,
        user_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Provide automated guidance for platform policies (cancellation, refunds, check-in)."""
        faq_knowledge = {
            "cancellation": "Bookings cancelled >48h before check-in receive a 100% refund. 24h-48h prior receive a 50% refund. Cancellations <24h before check-in are non-refundable.",
            "refund": "Approved refunds are credited to the original payment source within 5-7 business days.",
            "booking": "You can review and manage your confirmed bookings in the 'My Trip' section at /app/my-trip.",
            "partner": "Registered customers can apply to host stays or farm tours by clicking 'Become a Partner' in the customer sidebar.",
        }

        query_lower = user_query.lower()
        for key, answer in faq_knowledge.items():
            if key in query_lower:
                return {
                    "answer": answer,
                    "can_resolve": True,
                    "suggestion": "If you need further help with an active booking, please open a support ticket.",
                }

        return {
            "answer": "I can help explain platform policies or guide you to creating a ticket for personalized support.",
            "can_resolve": False,
            "suggestion": "Would you like to open a support ticket for our coordinator team?",
        }