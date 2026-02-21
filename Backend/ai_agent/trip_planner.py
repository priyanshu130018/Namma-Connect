import re
from typing import Any, Dict, List

from .recommendations import recommendation_agent


SYSTEM_PROMPT = """You are an AI Farm Tourism Trip Planner Assistant. 
 
You help tourists explore farms, creators, and book farm stays. 
 
You ONLY use the database tools. 
You NEVER invent farms or bookings. 
 
------------------------------------- 
DATABASE STRUCTURE 
------------------------------------- 
 
Tables: 
- farm_listing 
- farmer 
- creator 
- booking 
- tourist 
- login 
 
------------------------------------- 
YOUR RESPONSIBILITIES 
------------------------------------- 
 
1. When user wants to explore farms: 
   - Extract filters from message: 
       state 
       area 
       crop_types 
       stay_available 
       transport_available 
       activities 
   - Call search_farms tool. 
 
2. When user wants to explore creators: 
   - Extract: 
       niche 
       state 
       country 
   - Call search_creators tool. 
 
3. When user says: 
   - "book this" 
   - "confirm booking" 
   - "reserve it" 
   Then: 
       Call create_booking tool using: 
         tourist_login_id 
         item_id 
         booking_type 
         check_in 
         check_out 
         guests 
 
4. If user says: 
   - "show more" 
   - "other farms" 
   - "different state" 
   - "something else" 
   Call search again using updated filters. 
 
5. Always remember: 
   - Last shown farm list 
   - Selected item_id 
   - User's login id 
 
------------------------------------- 
RESPONSE RULES 
------------------------------------- 
 
When showing farms: 
Show: 
- Farm Name 
- Location (state, area) 
- Crop Types 
- Stay Available (Yes/No) 
- Transport Available (Yes/No) 
- Short Description 
 
When booking: 
Confirm clearly: 
- Farm Name 
- Check-in 
- Check-out 
- Guests 
- Booking ID 
 
Never fabricate booking confirmation. 
Only confirm after create_booking tool returns success.
"""


class TripPlannerAgent:
    def __init__(self):
        self.theme_keywords = [
            "adventure",
            "family",
            "luxury",
            "budget",
            "relax",
            "cultural",
        ]
        self.location_keywords = [
            "kerala",
            "coorg",
            "wayanad",
            "chickmagalur",
            "shimoga",
            "hassan",
        ]
        self.time_slots = ["morning", "afternoon", "evening", "night", "full day"]

    def _extract_filters(self, prompt: str) -> Dict[str, Any]:
        text = prompt.lower()
        filters: Dict[str, Any] = {
            "themes": [],
            "city": None,
            "country": None,
            "budget": None,
            "start_date": None,
            "end_date": None,
            "time_slot": None,
        }

        for kw in self.theme_keywords:
            if kw in text:
                filters["themes"].append(kw)

        for loc in self.location_keywords:
            if loc in text:
                filters["city"] = loc
                break

        budget_match = re.search(r"(under|below|less than)\s*₹?\s*(\d+)", text)
        if not budget_match:
            budget_match = re.search(r"₹\s*(\d+)", text)
        if budget_match:
            filters["budget"] = int(budget_match.group(2))

        date_strings = re.findall(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}", text)
        if date_strings:
            filters["start_date"] = date_strings[0]
            if len(date_strings) > 1:
                filters["end_date"] = date_strings[1]

        for slot in self.time_slots:
            if slot in text:
                filters["time_slot"] = slot
                break

        return filters

    def get_trip_suggestion(self, prompt: str, farm_listings: List[Any]):
        prompt = (prompt or "").strip()
        if not prompt:
            return {
                "response": "Hello! I am your AI Trip Planner. Tell me what kind of farm experience you want, and I will search our trips database for you.",
                "suggestions": [],
            }

        filters = self._extract_filters(prompt)

        matches = recommendation_agent.get_recommendations(
            prompt, farm_listings, item_type="farm", top_n=10
        )

        if not matches:
            return {
                "response": "I could not find any trips in the database that match this request. Try changing the location, dates, or theme.",
                "suggestions": [],
            }

        top_matches = matches[:3]

        intro_parts: List[str] = []
        if filters["themes"]:
            intro_parts.append(", ".join(filters["themes"]))
        if filters["city"]:
            intro_parts.append(filters["city"])
        if filters["time_slot"]:
            intro_parts.append(filters["time_slot"])
        intro = ", ".join(intro_parts) if intro_parts else "your preferences"

        lines: List[str] = []
        for index, match in enumerate(top_matches, start=1):
            farm = match["item"]
            name = getattr(farm, "name", "Unnamed trip")
            area = getattr(farm, "area", None) or ""
            state = getattr(farm, "state", None) or ""
            location = ", ".join(x for x in [state, area] if x) or "Not specified"
            crop_types = getattr(farm, "crop_types", None) or "Not specified"
            stay_text = getattr(farm, "stay_available", None) or ""
            transport_text = getattr(farm, "transport_available", None) or ""
            stay_flag = "Yes" if stay_text.strip() else "No"
            transport_flag = "Yes" if transport_text.strip() else "No"
            description = getattr(farm, "description", None) or "No description yet."
            score = match["matchScore"]

            lines.append(
                f"{index}. Farm Name: {name}\n"
                f"   Location: {location}\n"
                f"   Crop Types: {crop_types}\n"
                f"   Stay Available: {stay_flag}\n"
                f"   Transport Available: {transport_flag}\n"
                f"   Short Description: {description.strip()}\n"
                f"   Match Score: {score}%"
            )

        response = (
            f"Based on {intro}, here are some farms from our database:\n\n"
            + "\n\n".join(lines)
            + "\n\nReply with the farm number you like most, or say 'show more options' to see different farms."
        )

        return {
            "response": response,
            "suggestions": matches,
        }


trip_planner_agent = TripPlannerAgent()
