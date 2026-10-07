"""Authentic Karnataka Demographic and Profile Data for Synthetic Seeding."""

import random
import json
from typing import Dict, Any, List

FIRST_NAMES = [
    "Basavaraj", "Ramesh", "Manjunath", "Shivakumar", "Girish", "Pradeep", "Venkatesh", "Anand",
    "Suresh", "Praveen", "Deepak", "Raghavendra", "Kiran", "Shankar", "Santosh", "Vijay", "Naveen",
    "Chandrashekar", "Mallikarjun", "Nagaraj", "Lakshmi", "Shweta", "Anitha", "Kavitha", "Poornima",
    "Geetha", "Suma", "Divya", "Pooja", "Rekha", "Radhika", "Soumya", "Vidya", "Nalini", "Vani",
    "Asha", "Roopa", "Bhavya", "Savitha", "Meenakshi", "Priyanka", "Sunitha", "Rashmi", "Lavanya",
    "Tejas", "Harshith", "Varun", "Chetan", "Karthik", "Darshan", "Rohith", "Vinay", "Sharath",
    "Sunil", "Mohan", "Siddarama", "Shivanna", "Chandru", "Bopaiah", "Muthappa", "Cauvery", "Kuttappa",
    "Appanna", "Thimmaiah", "Somanna", "Devaki", "Parvathi", "Gowramma", "Shantha", "Kamalamma",
    "Jayamma", "Channamma", "Sharada", "Girijamma", "Sujatha", "Bharathi", "Renuka", "Umadevi",
]

LAST_NAMES = [
    "Gowda", "Patil", "Shetty", "Hegde", "Bhat", "Rao", "Reddy", "Kulkarni", "Deshmukh", "Naik",
    "Acharya", "Kurup", "Pujari", "Hiremath", "Angadi", "Joshi", "Kamath", "Pai", "Nayaka", "Shastry",
    "Poojary", "Ballal", "Alva", "Rai", "Marathe", "Nadiger", "Deshpande", "Muthappa", "Kuttappa",
    "Bopaiah", "Somanna", "Devanga", "Kumble", "Badiger", "Kumbhar", "Kalyani", "Biradar", "Inamdar",
]

PROVIDER_BUSINESS_SUFFIXES = [
    "Agro Retreat & Farms", "Eco Plantations", "Heritage Homestays", "Western Ghats Trails",
    "Bio-Farms & Agro Tourism", "Nature Camps", "Spice Woods & Stays", "Organic Farm collective",
    "Adventure Expeditions", "Cultural Guided Tours", "River & Valley Experiences",
    "Highland Stays & Treks", "Coffee Estates & Tourism", "Artisan Workshops", "Cinematics & Media",
]

ID_TYPES = ["Aadhaar", "PAN", "Land_RTC", "Guide_License", "Commercial_DL"]

# Curated Travel Preference Profiles for Personalization Testing
PREFERENCE_ARCHETYPES = [
    {
        "travel_style": "adventure",
        "budget_style": "budget",
        "trip_type": "friends",
        "interests": ["adventure", "nature", "photography"],
        "food_preference": "no_preference",
        "walking_preference": "normal",
    },
    {
        "travel_style": "relaxed",
        "budget_style": "premium",
        "trip_type": "family",
        "interests": ["wellness", "nature", "food"],
        "food_preference": "vegetarian",
        "walking_preference": "low_walking",
    },
    {
        "travel_style": "balanced",
        "budget_style": "balanced",
        "trip_type": "couple",
        "interests": ["culture", "photography", "nature"],
        "food_preference": "vegetarian",
        "walking_preference": "normal",
    },
    {
        "travel_style": "relaxed",
        "budget_style": "balanced",
        "trip_type": "solo",
        "interests": ["nature", "food", "wellness"],
        "food_preference": "vegan",
        "walking_preference": "normal",
    },
    {
        "travel_style": "adventure",
        "budget_style": "balanced",
        "trip_type": "solo",
        "interests": ["adventure", "photography", "culture"],
        "food_preference": "non_vegetarian",
        "walking_preference": "normal",
    },
    {
        "travel_style": "balanced",
        "budget_style": "premium",
        "trip_type": "couple",
        "interests": ["food", "culture", "shopping", "photography"],
        "food_preference": "no_preference",
        "walking_preference": "normal",
    },
]

def generate_travel_preferences(is_priyanshu: bool = False, archetype_idx: int = 0) -> str:
    """Generate realistic JSON travel preferences for users."""
    if is_priyanshu:
        prefs = {
            "travel_style": "balanced",
            "budget_style": "balanced",
            "trip_type": "couple",
            "interests": ["nature", "culture", "food", "photography", "adventure"],
            "food_preference": "vegetarian",
            "walking_preference": "normal",
            "ai_use_preferences": True,
            "ai_consider_previous_trips": True,
            "ai_ask_before_changes": True,
        }
    else:
        base = PREFERENCE_ARCHETYPES[archetype_idx % len(PREFERENCE_ARCHETYPES)]
        prefs = {
            "travel_style": base["travel_style"],
            "budget_style": base["budget_style"],
            "trip_type": base["trip_type"],
            "interests": base["interests"],
            "food_preference": base["food_preference"],
            "walking_preference": base["walking_preference"],
            "ai_use_preferences": True,
            "ai_consider_previous_trips": bool(archetype_idx % 2 == 0),
            "ai_ask_before_changes": True,
        }
    return json.dumps(prefs)

def generate_notification_preferences() -> str:
    return json.dumps({
        "email": True,
        "sms": True,
        "promo": False,
        "bookings": True,
        "payments": True,
        "support": True,
    })

def generate_privacy_preferences() -> str:
    return json.dumps({
        "share_profile": True,
        "personalize_location": True,
    })
