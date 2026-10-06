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
        if settings.ENV in ["test", "testing"]:
            return False
        k = (settings.GEMINI_API_KEY or "").strip()
        if not k or k.startswith("your-") or k.startswith("placeholder") or k.startswith("dummy"):
            return False
        return True

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

    DESTINATION_SYNONYMS: Dict[str, str] = {
        # Coorg / Kodagu
        "kodava": "Coorg",
        "kodavu": "Coorg",
        "kodagu": "Coorg",
        "coorg": "Coorg",
        "madikeri": "Coorg",
        "somwarpet": "Coorg",
        "virajpet": "Coorg",
        "kushalnagar": "Coorg",
        # Chikmagalur
        "chikmagalur": "Chikmagalur",
        "chikkamagaluru": "Chikmagalur",
        "mudigere": "Chikmagalur",
        "kudremukh": "Chikmagalur",
        "tarikere": "Chikmagalur",
        # Mysuru
        "mysore": "Mysuru",
        "mysuru": "Mysuru",
        "kabini": "Mysuru",
        "nanjangud": "Mysuru",
        # Shivamogga
        "shimoga": "Shivamogga",
        "shivamogga": "Shivamogga",
        "thirthahalli": "Shivamogga",
        "sagara": "Shivamogga",
        "jog falls": "Shivamogga",
        # Coastal & other Karnataka regions
        "mangalore": "Mangalore",
        "mangaluru": "Mangalore",
        "udupi": "Udupi",
        "gokarna": "Gokarna",
        "uttara kannada": "Uttara Kannada",
        "dakshina kannada": "Dakshina Kannada",
        "sirsi": "Sirsi",
        "sakleshpur": "Sakleshpur",
        "hassan": "Sakleshpur",
        "mandya": "Mandya",
        "maddur": "Mandya",
        "ramanagara": "Ramanagara",
        "hampi": "Hampi",
        "hosapete": "Hampi",
        "dandeli": "Dandeli",
        "wayanad": "Wayanad",
        "karnataka": "Karnataka",
    }

    @classmethod
    def normalize_destination(cls, destination: Optional[str]) -> Optional[str]:
        """Normalize vernacular, regional, and synonym destination names to canonical forms."""
        if not destination or not destination.strip():
            return None
        dest_clean = destination.strip().lower()
        if dest_clean in cls.DESTINATION_SYNONYMS:
            return cls.DESTINATION_SYNONYMS[dest_clean]
        for key, canonical in cls.DESTINATION_SYNONYMS.items():
            if key in dest_clean:
                return canonical
        return destination.strip().title()

    @classmethod
    def _fallback_intent_classifier(
        cls,
        prompt: str,
        session_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Deterministic intent and parameter extractor when Gemini API is unavailable or returns non-JSON.
        """
        import re
        p_lower = prompt.lower().strip() if prompt else ""
        words = set(re.findall(r'[\w\u0C80-\u0CFF\u0900-\u097F]+', p_lower))
        session_ctx = session_context or {}

        # Default structure
        result: Dict[str, Any] = {
            "intent": "informational",
            "query": prompt.strip() if prompt else "",
            "destination": session_ctx.get("destination"),
            "category": session_ctx.get("category"),
            "budget": session_ctx.get("max_budget"),
            "duration_days": session_ctx.get("duration_days"),
        }

        if not p_lower or not words:
            result["intent"] = "conversational"
            return result

        # 1. Parameter Extraction
        # Destination extraction
        for synonym, canonical in cls.DESTINATION_SYNONYMS.items():
            if synonym in p_lower:
                result["destination"] = canonical
                break

        # Category extraction
        for cat_term, cat_val in [
            ("stay", "Stay"), ("homestay", "Stay"), ("farmstay", "Stay"), ("resort", "Stay"), ("cottage", "Stay"),
            ("food", "Food"), ("dining", "Food"), ("cuisine", "Food"), ("meal", "Food"),
            ("tour", "Guides & Tours"), ("guide", "Guides & Tours"), ("safari", "Guides & Tours"),
            ("experience", "Experiences"), ("harvest", "Experiences"), ("workshop", "Experiences"), ("pottery", "Experiences"), ("trek", "Experiences"),
            ("event", "Events"), ("festival", "Events"), ("fair", "Events"), ("mela", "Events"), ("jatre", "Events"),
        ]:
            if cat_term in words or cat_term in p_lower:
                result["category"] = cat_val
                break

        # Budget extraction
        budget_match = re.search(r'(?:under|below|budget|₹|rs\.?)\s*(\d{3,6})', p_lower)
        if budget_match:
            try:
                result["budget"] = float(budget_match.group(1))
            except Exception:
                pass

        # Duration extraction
        duration_match = re.search(r'(\d+)\s*(?:day|days|night|nights)', p_lower)
        if duration_match:
            try:
                result["duration_days"] = int(duration_match.group(1))
            except Exception:
                pass

        # 2. Intent Classification
        # A. Conversational / Small Talk
        exact_small_talk = {
            "hi", "hii", "hiii", "hello", "helloo", "hellooo", "hey", "heyy",
            "namaskara", "namaste", "namaskar", "greetings",
            "thanks", "thank", "thankyou", "thank you", "dhanyavada", "dhanyavadagalu", "shukriya",
            "bye", "goodbye", "ok", "okay",
        }
        if p_lower in exact_small_talk or re.fullmatch(r"(?:h+i+|he+y+|hel+o+|ihel+o+)", p_lower):
            result["intent"] = "conversational"
            return result

        conversational_phrases = (
            "how are you", "how r u", "who are you", "what are you", "how do you do",
            "good morning", "good afternoon", "good evening",
        )
        if any(phrase in p_lower for phrase in conversational_phrases):
            result["intent"] = "conversational"
            return result

        if words & {"namaskara", "namaste", "hello", "hi", "hey", "thanks", "thank", "dhanyavada", "shukriya"}:
            discovery_actions = {
                "recommend", "suggest", "find", "search", "show", "list", "book", "reserve",
                "looking for", "where to stay", "places to stay",
            }
            if not (words & discovery_actions or result.get("category") or result.get("duration_days")):
                result["intent"] = "conversational"
                return result

        # B. Itinerary Intent
        itinerary_terms = {
            "itinerary", "plan my trip", "plan a trip", "plan trip", "weekend trip", "day trip",
            "2 day", "3 day", "2 days", "3 days", "4 days", "5 days", "योजना", "ಪ್ಲಾನ್",
        }
        if any(term in p_lower for term in itinerary_terms) or (("plan" in words or "trip" in words) and result.get("duration_days")):
            result["intent"] = "itinerary"
            return result

        # C. Informational Intent (Questions about season, weather, culture, facts, reasons)
        question_starters = {
            "what is", "what are", "when is", "when to", "why is", "why are", "how is", "how do",
            "best season", "best time", "season to visit", "time to visit", "famous for",
            "tell me about", "history of", "culture of", "weather in", "climate in",
            "ಹೇಗೆ", "ಯಾವಾಗ", "ಏಕೆ", "ಹವಾಮಾನ", "मौसम", "कब", "क्यों", "कैसा",
        }
        has_question_starter = any(p_lower.startswith(qs) or qs in p_lower for qs in question_starters)
        discovery_actions = {
            "recommend", "suggest", "find", "search", "show", "list", "book", "reserve",
            "looking for", "where to stay", "places to stay", "homestays", "farmstays",
        }
        has_discovery_action = any(action in p_lower for action in discovery_actions)

        if has_question_starter and not has_discovery_action:
            result["intent"] = "informational"
            return result

        # D. Catalog Search (Specific crops, farm activities, handicrafts)
        catalog_terms = {
            "coconut", "coconuts", "coffee", "tea", "spice", "spices", "pepper", "cardamom",
            "areca", "arecanut", "paddy", "rice", "sugarcane", "jaggery", "vanilla", "honey",
            "bee", "beekeeping", "organic", "harvest", "pottery", "craft", "artisan",
            "trek", "treks", "trail", "trails", "safari", "birding", "camp", "camping",
            "fair", "mela", "jatre", "festival", "festivals", "workshop", "workshops",
            "farm", "farms", "farming", "plantation", "plantations", "estate", "estates",
            "stay", "stays", "homestay", "homestays", "farmstay", "farmstays", "resort", "cottage",
            "ತೋಟ", "ಕಾಫಿ", "ಚಹಾ", "ಕೃಷಿ", "ಜೇನು", "ಕುಂಬಾರಿಕೆ", "ಜಾತ್ರೆ", "ಸಂತೆ", "ಹಬ್ಬ", "ಹೋಮ್‌ಸ್ಟೇ",
            "ವಾಸ", "ವಾಸ್ತವ್ಯ", "ಸ್ಟೇ", "ಆಹಾರ", "ಕಾರ್ಯಾಗಾರ", "फार्म", "खेत", "खेती", "कॉफी", "चाय",
            "स्टे", "सफर", "कटाई", "शहद", "मेला", "त्योहार", "पर्यटन", "कार्यशाला",
        }
        if words & catalog_terms:
            if has_discovery_action or result.get("budget") or "recommend" in words or "suggest" in words:
                result["intent"] = "recommendation"
            else:
                result["intent"] = "catalog_search"
            return result

        # E. Location Search (e.g. "near Kodava", "in Coorg", "around Chikmagalur", "places to visit in Coorg")
        if any(prefix in p_lower for prefix in ["near ", "around ", "in ", "places in ", "places to visit in "]) and result.get("destination"):
            result["intent"] = "location_search"
            return result

        # F. Recommendation Intent
        if has_discovery_action or "recommend" in words or "suggest" in words or "stay" in words:
            result["intent"] = "recommendation"
            return result

        # If a destination alone is given, treat as location search
        if result.get("destination") and len(words) <= 3:
            result["intent"] = "location_search"
            return result

        return result

    @classmethod
    def classify_intent(
        cls,
        prompt: str,
        session_context: Optional[Dict[str, Any]] = None,
        lang_code: str = "en",
    ) -> Dict[str, Any]:
        """
        Classify the user prompt into structured JSON using Gemini API with deterministic fallback.
        Valid intents: conversational, informational, catalog_search, location_search, recommendation, itinerary.
        """
        fallback_res = cls._fallback_intent_classifier(prompt, session_context)
        if not cls.is_configured() or not prompt or not prompt.strip():
            return fallback_res

        system_instruction = (
            "You are an intent classification and parameter extraction engine for Namma AI, a Karnataka rural tourism and travel assistant.\n"
            "Analyze the user's message and current conversation context to classify the intent and extract relevant search parameters.\n\n"
            "Return STRICT JSON ONLY (no markdown fences, no formatting, no preamble) matching this schema:\n"
            "{\n"
            '  "intent": "conversational" | "informational" | "catalog_search" | "location_search" | "recommendation" | "itinerary",\n'
            '  "query": "search query string or null",\n'
            '  "destination": "canonical Karnataka destination name or null",\n'
            '  "category": "Stay" | "Experiences" | "Guides & Tours" | "Events" | null,\n'
            '  "budget": number or null,\n'
            '  "duration_days": integer or null\n'
            "}\n\n"
            "Intent Guidelines:\n"
            '- "conversational": Small talk, greetings, thanks, pleasantries ("hello", "namaskara", "how are you", "thank you").\n'
            '- "informational": General Karnataka travel advice, weather, best season, culture, facts ("What is the best season to visit Coorg?", "Why is Coorg famous?").\n'
            '- "catalog_search": Direct searches for specific farm types, crops, activities, craft workshops ("coconut", "tea plantation", "areca farm", "pottery workshop").\n'
            '- "location_search": Destination-led discovery queries ("near Kodava", "places in Chikmagalur", "stays in Sakleshpur").\n'
            '- "recommendation": Contextual recommendation requests ("suggest me some fair", "recommend a romantic stay under 3000", "family friendly homestay").\n'
            '- "itinerary": Trip planning queries specifying duration or itineraries ("plan a 2 day trip to Coorg", "weekend itinerary for Chikmagalur").\n\n'
            "Location Normalization: Map 'Kodava'/'Kodavu'/'Madikeri' to 'Coorg', 'Chikkamagaluru'/'Mudigere' to 'Chikmagalur', 'Mysore' to 'Mysuru', 'Shimoga'/'Thirthahalli' to 'Shivamogga'."
        )

        try:
            model_name = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash-lite")
            if not model_name.startswith("models/"):
                model_name = f"models/{model_name}"
            url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent"

            context_str = json.dumps(session_context or {}, ensure_ascii=False)
            req_body = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": (
                                    f"{system_instruction}\n\n"
                                    f"Conversation context: {context_str}\n\n"
                                    f"User message: {prompt}"
                                )
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "responseMimeType": "application/json",
                }
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(req_body, ensure_ascii=False).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": settings.GEMINI_API_KEY,
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=4) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                parsed = json.loads(raw_text)
                valid_intents = {"conversational", "informational", "catalog_search", "location_search", "recommendation", "itinerary"}
                if parsed.get("intent") in valid_intents:
                    if parsed.get("destination"):
                        parsed["destination"] = cls.normalize_destination(parsed["destination"])
                    return parsed
        except Exception as exc:
            logger.debug(f"Gemini intent classification fallback engaged: {exc}")

        return fallback_res

    @classmethod
    def has_recommendation_intent(
        cls,
        prompt: str,
        destination: Optional[str] = None,
        category: Optional[str] = None,
    ) -> bool:
        """Convenience method checking if prompt warrants marketplace service retrieval."""
        classification = cls.classify_intent(prompt, {"destination": destination, "category": category})
        return classification.get("intent") in {"catalog_search", "location_search", "recommendation", "itinerary"}

    @classmethod
    def _generate_general_answer(
        cls,
        prompt: str,
        lang_code: str,
        conversation_id: str,
        accumulated_context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Use Gemini for ordinary questions that do not require catalog/service cards."""
        fallback = (
            "I can help with Karnataka travel questions, destinations, culture, food, seasons, "
            "trip ideas, and general planning. For bookable stays, tours, farm experiences, "
            "and other marketplace services, ask me to find or recommend options."
        )
        if not cls.is_configured():
            return fallback

        lang_instruction = "Respond in English."
        if lang_code == "kn":
            lang_instruction = "Respond strictly in Kannada (ಕನ್ನಡ)."
        elif lang_code == "hi":
            lang_instruction = "Respond strictly in Hindi (हिन्दी)."

        context = json.dumps(accumulated_context or {}, ensure_ascii=False)
        system_instruction = (
            "You are Namma AI, a helpful Karnataka travel assistant. "
            f"{lang_instruction} "
            "Answer the user's general travel or informational question directly and naturally. "
            "Do not create or claim specific marketplace listings, providers, prices, availability, "
            "booking confirmations, refunds, or service IDs. "
            "When the user asks a general question, answer the question instead of giving a canned "
            "marketplace prompt. If the question is about current facts you cannot verify, say that "
            "you cannot verify live information. Keep the answer useful and concise."
        )

        try:
            model_name = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash-lite")
            if not model_name.startswith("models/"):
                model_name = f"models/{model_name}"
            url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent"
            req_body = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": (
                                    f"{system_instruction}\n\n"
                                    f"Conversation context: {context}\n\n"
                                    f"User question: {prompt}"
                                )
                            }
                        ]
                    }
                ]
            }
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": settings.GEMINI_API_KEY,
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(req_body, ensure_ascii=False).encode("utf-8"),
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return data["candidates"][0]["content"]["parts"][0]["text"].strip() or fallback
        except Exception as exc:
            logger.warning("General Gemini answer failed: %s", exc)
            return fallback

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
        prompt_lower = prompt.lower().strip() if prompt else ""
        logger.info(
            f"AI request received | conversation_id={conv_id} | language={lang_code} | message_length={len(prompt)}"
        )

        # 1. Structured Intent Classification & Parameter Extraction
        classification = cls.classify_intent(prompt, accumulated, lang_code)
        intent = classification.get("intent", "informational")

        # Update accumulated context with newly extracted parameters
        if classification.get("destination"):
            accumulated["destination"] = classification["destination"]
        elif destination:
            accumulated["destination"] = cls.normalize_destination(destination)

        if classification.get("category"):
            accumulated["category"] = classification["category"]
        elif category:
            accumulated["category"] = category

        if classification.get("budget"):
            accumulated["max_budget"] = classification["budget"]

        if classification.get("duration_days"):
            accumulated["duration_days"] = classification["duration_days"]

        effective_dest = destination or accumulated.get("destination")
        if effective_dest:
            effective_dest = cls.normalize_destination(effective_dest)
            accumulated["destination"] = effective_dest

        effective_cat = category or accumulated.get("category")
        effective_budget = accumulated.get("max_budget")

        # 2. Intent Routing
        # Conversational and Informational intents return direct general text answers without service cards.
        if intent in {"conversational", "informational"}:
            logger.info(f"Non-catalog query routed to general answer (intent={intent}): '{prompt}'")
            reply = cls._generate_general_answer(
                prompt,
                lang_code,
                conv_id,
                accumulated,
            )
            session_data["history"].append({"user": prompt, "ai": reply})
            return {
                "reply": reply,
                "recommended_services": [],
                "source": "gemini_general",
                "diagnostics": {
                    "intent": intent,
                    "candidate_count": 0,
                    "final_count": 0,
                    "results": [],
                },
            }

        # 3. Discovery & Recommendation Intent (catalog_search, location_search, recommendation, itinerary)
        from app.services.search import SemanticSearchService

        candidate_k = getattr(settings, "RECOMMENDATION_CANDIDATE_K", 20)
        final_k = getattr(settings, "RECOMMENDATION_FINAL_K", 5)
        min_sim = getattr(settings, "MIN_RECOMMENDATION_SIMILARITY", 0.16)

        search_query = classification.get("query") or prompt

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
            active_model = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash-lite")
            if not active_model.startswith("models/"):
                active_model = f"models/{active_model}"
            candidate_models = [active_model, "models/gemini-3.5-flash-lite", "models/gemini-3.6-flash"]
            for model_name in candidate_models:
                try:
                    logger.info(f"Gemini request started for conversation {conv_id} using {model_name}...")
                    url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent"
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
                    headers = {
                        "Content-Type": "application/json",
                        "x-goog-api-key": settings.GEMINI_API_KEY,
                    }
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