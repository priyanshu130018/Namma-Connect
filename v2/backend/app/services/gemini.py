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

        lang_code = (language or "en").lower().strip()
        logger.info(
            f"AI request received | conversation_id={conv_id} | language={lang_code} | message_length={len(prompt)}"
        )

        prompt_lower = prompt.lower().strip()

        # Extract & accumulate context across turns
        for region in ["coorg", "kodagu", "wayanad", "chikmagalur", "chikkamagaluru", "mandya", "mysore", "mysuru", "hampi", "kabini", "sakleshpur"]:
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

        from app.services.search import SemanticSearchService

        published_services, _ = SemanticSearchService.semantic_search(
            db,
            query=prompt,
            category=effective_cat,
            location=effective_dest,
            max_price=effective_budget,
            limit=10,
            status="PUBLISHED",
        )
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
            for s in published_services
        ]

        lang_instruction = "Respond in English."
        if lang_code == "kn" or "kannada" in lang_code:
            lang_instruction = "Respond strictly in Kannada (ಕನ್ನಡ) unless requested otherwise."
        elif lang_code == "hi" or "hindi" in lang_code:
            lang_instruction = "Respond strictly in Hindi (हिन्दी) unless requested otherwise."

        # Attempt Gemini 1.5 Flash API
        if cls.is_configured():
            try:
                logger.info(f"Gemini request started for conversation {conv_id}...")
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                system_instruction = (
                    f"You are Namma AI, your personal Karnataka travel assistant. {lang_instruction} "
                    "Recommend only verified agritourism services from the catalog. "
                    "Never invent prices or confirm bookings directly; always direct to the Booking button."
                )
                req_body = {
                    "contents": [
                        {
                            "parts": [
                                {
                                    "text": (
                                        f"{system_instruction}\n\n"
                                        f"Accumulated Context: {json.dumps(accumulated)}\n\n"
                                        f"Catalog:\n{json.dumps(service_catalog)}\n\n"
                                        f"User Prompt: {prompt}"
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
                with urllib.request.urlopen(req, timeout=10) as resp:
                    logger.info("Gemini response received successfully.")
                    data = json.loads(resp.read().decode("utf-8"))
                    text_reply = data["candidates"][0]["content"]["parts"][0]["text"]
                    session_data["history"].append({"user": prompt, "ai": text_reply})
                    return {
                        "reply": text_reply,
                        "recommended_services": service_catalog[:4],
                        "source": "gemini_api",
                    }
            except Exception as e:
                logger.warning(f"Gemini API call failed: {e}. Falling back to grounded rule engine.")

        # Grounded multi-turn rule engine fallback
        matched = [
            s for s in service_catalog
            if not effective_dest or effective_dest.lower() in s["location"].lower() or effective_dest.lower() in s["district"].lower()
        ] or service_catalog
        selected = matched[:3]

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
            return {"reply": reply, "recommended_services": selected, "source": "grounded_catalog"}

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
            return {"reply": "\n".join(lines), "recommended_services": selected, "source": "grounded_catalog"}

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
            return {"reply": "\n".join(lines), "recommended_services": selected, "source": "grounded_catalog"}

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
                "You can view real-time availability and reserve any of these directly through the marketplace."
            )

        return {
            "reply": "\n".join(reply_lines),
            "recommended_services": selected,
            "source": "grounded_catalog",
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