import re
from typing import Any, Dict, List
from app.ai.recommender import recommender_agent

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
         tourist_id 
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
   - User's user id 
 
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

class ChatbotAgent:
    def __init__(self):
        self.theme_keywords = ["adventure", "family", "luxury", "budget", "relax", "cultural", "scenic", "authentic"]
        self.location_keywords = ["kerala", "coorg", "wayanad", "chickmagalur", "shimoga", "hassan", "mysore", "ucl", "bangalore"]
        self.role_keywords = {
            "photographer": ["photographer", "photo", "photography", "shoot"],
            "videographer": ["videographer", "video", "videography", "film", "cinematic"],
            "drone specialist": ["drone", "aerial", "pilot"],
            "content creator": ["creator", "influencer", "blogger"]
        }
        self.time_slots = ["morning", "afternoon", "evening", "night", "full day"]

    def _extract_filters(self, prompt: str) -> Dict[str, Any]:
        text = prompt.lower()
        filters = {
            "themes": [],
            "city": None,
            "role": None,
            "name": None,
            "booking_intent": False,
            "show_more": False
        }

        if any(kw in text for kw in ["show more", "next", "more options", "other"]):
            filters["show_more"] = True

        if any(kw in text for kw in ["book", "reserve", "confirm", "stay at"]):
            filters["booking_intent"] = True

        for kw in self.theme_keywords:
            if kw in text:
                filters["themes"].append(kw)

        for loc in self.location_keywords:
            if loc in text:
                filters["city"] = loc
                break

        for role, keywords in self.role_keywords.items():
            if any(kw in text for kw in keywords):
                filters["role"] = role
                break

        return filters

    def get_trip_suggestion(self, prompt: str, farm_listings: List[Any], creators: List[Any] = None, session_state: Dict = None):
        prompt = (prompt or "").strip()
        state = session_state or {"offset": 0, "last_results": [], "type": "farm"}
        
        if not prompt:
            return {
                "response": "Hello! I am your AI Trip Planner. I can help you find beautiful farm stays or professional creators (photographers, videographers) for your trip. What are you looking for today?",
                "suggestions": [],
                "state": state
            }

        filters = self._extract_filters(prompt)
        
        search_type = "creator" if filters["role"] or "creator" in prompt.lower() else "farm"
        items_to_search = creators if search_type == "creator" else farm_listings
        
        if filters["show_more"] and state.get("last_results"):
            state["offset"] += 3
            matches = state["last_results"]
        else:
            state["offset"] = 0
            matches = recommender_agent.get_recommendations(
                prompt, items_to_search, item_type=search_type, top_n=15
            )
            state["last_results"] = matches
            state["type"] = search_type

        if not matches:
            return {
                "response": f"I couldn't find any {search_type}s matching your request. Try different keywords or locations!",
                "suggestions": [],
                "state": state
            }

        current_page = matches[state["offset"]:state["offset"] + 3]
        if not current_page and state["offset"] > 0:
            state["offset"] = 0
            current_page = matches[:3]

        response_text = f"I found some great {search_type}s for you!" if not filters["show_more"] else "Here are some more options:"
        
        suggestions = []
        for match in current_page:
            item = match["item"]
            is_farm = state["type"] == "farm"
            
            sugg = {
                "id": item.id,
                "type": state["type"],
                "name": item.farm_name if is_farm else item.name,
                "subtitle": item.crop_types if is_farm else item.niche,
                "location": f"{item.city}, {item.state}" if item.city else item.state,
                "score": match["matchScore"],
                "emoji": "🌾" if is_farm else "🎬",
                "price": f"₹{int(item.price_per_night)}" if is_farm else (f"₹{int(item.rate)}/day" if getattr(item, 'rate', 0) else "Contact")
            }
            suggestions.append(sugg)

        return {
            "response": response_text,
            "suggestions": suggestions,
            "state": state
        }

chatbot_agent = ChatbotAgent()
trip_planner_agent = chatbot_agent
