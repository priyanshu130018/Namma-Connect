"""LangGraph workflow node functions for Namma Connect Agent."""

import json
import re
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from sqlalchemy.orm import Session

from app.modules.user.domain.models import User
from app.modules.marketplace.domain.models import Service
from app.modules.marketplace.infrastructure.repository import MarketplaceRepository
from app.modules.trip.domain.models import Trip, TripDay, TripItem, AITripPlan
from app.modules.trip.infrastructure.repository import TripRepository
from app.modules.recommendation.infrastructure.repository import RecommendationRepository
from app.modules.recommendation.application.service import RecommendationService
from app.modules.ai.trip_planner.state import TravelerConstraints, PlannerState
from app.modules.ai.trip_planner.builder import ItineraryBuilder
from app.modules.ai.trip_planner.validator import ItineraryValidator
from app.modules.ai.trip_planner.refiner import ItineraryRefiner
from app.modules.ai.trip_planner.persistence import TripPersistenceEngine
from app.modules.booking.infrastructure.repository import BookingRepository
from app.modules.booking.application.service import BookingService
from app.modules.booking.presentation.schemas import BookingCreateRequest
from app.modules.payment.infrastructure.repository import PaymentRepository
from app.modules.payment.application.service import PaymentService
from app.modules.payment.presentation.schemas import CreateOrderRequest
from app.modules.notification.infrastructure.repository import NotificationRepository
from app.modules.notification.application.service import NotificationService
from app.services.email import EmailService
from app.modules.ai.agent.state import AgentState
from app.modules.ai.agent.policies import AgentPolicies


DISTRICT_SYNONYMS = {
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
    "hampi": "Ballari",
    "udupi": "Udupi",
    "bengaluru": "Bengaluru Rural",
    "bangalore": "Bengaluru Rural",
    "bidar": "Bidar",
    "belagavi": "Belagavi",
    "belgaum": "Belagavi",
    "bagalkote": "Bagalkote",
    "bagalkot": "Bagalkote",
    "vijayapura": "Vijayapura",
    "bijapur": "Vijayapura",
    "kalaburagi": "Kalaburagi",
    "gulbarga": "Kalaburagi",
    "yadgir": "Yadgir",
    "raichur": "Raichur",
    "koppal": "Koppal",
    "gadag": "Gadag",
    "dharwad": "Dharwad",
    "hubli": "Dharwad",
    "hubballi": "Dharwad",
    "haveri": "Haveri",
    "ballari": "Ballari",
    "bellary": "Ballari",
    "vijayanagara": "Vijayanagara",
    "davangere": "Davangere",
    "chitradurga": "Chitradurga",
    "tumakuru": "Tumakuru",
    "tumkur": "Tumakuru",
    "kolar": "Kolar",
    "chikkaballapur": "Chikkaballapur",
    "ramanagara": "Ramanagara",
    "mandya": "Mandya",
    "chamarajanagar": "Chamarajanagar",
    "dakshina kannada": "Dakshina Kannada",
    "mangalore": "Dakshina Kannada",
    "mangaluru": "Dakshina Kannada",
}

CATEGORY_KEYWORDS = {
    "stay": "farm-stays",
    "homestay": "farm-stays",
    "cottage": "farm-stays",
    "resort": "farm-stays",
    "hotel": "farm-stays",
    "farm": "farm-stays",
    "tour": "agro-tours",
    "trail": "agro-tours",
    "walk": "agro-tours",
    "trek": "agro-tours",
    "activity": "agro-tours",
    "activities": "agro-tours",
    "workshop": "workshops",
    "craft": "workshops",
    "pottery": "workshops",
}


def understand_request_node(state: AgentState) -> Dict[str, Any]:
    """Node 1: Parse and structure user request, extract travel entities, dates, budget, approvals, and intent."""
    text = (state.get("current_user_request") or "").strip()
    lower = text.lower()

    # 1. Detect Human Approval Response
    approval_required = state.get("approval_required", False)
    prev_approval_status = state.get("approval_status")
    approval_status = prev_approval_status
    approval_prompt = state.get("approval_prompt")
    approval_action = state.get("approval_action")

    if approval_required or prev_approval_status == "PENDING":
        if AgentPolicies.is_approval_confirmation(text):
            approval_status = "APPROVED"
            approval_required = False
        elif AgentPolicies.is_approval_rejection(text):
            approval_status = "REJECTED"
            approval_required = False

    # 2. Detect Cancellation Intent
    is_cancellation = AgentPolicies.is_cancellation_intent(text) or bool(state.get("cancellation_request"))
    cancellation_request = state.get("cancellation_request")
    if is_cancellation:
        code_match = re.search(r"\b(NC-[a-zA-Z0-9-]+)\b", text, re.IGNORECASE)
        if not code_match:
            code_match = re.search(r"(?:booking|reservation|order)\s*(?:#|code|number)?\s*([a-zA-Z0-9-]+)", text, re.IGNORECASE)
        target_code = code_match.group(1) if code_match else (cancellation_request.get("booking_code") if cancellation_request else None)
        cancellation_request = {
            "booking_code": target_code,
            "reason": text if AgentPolicies.is_cancellation_intent(text) else (cancellation_request.get("reason") if cancellation_request else text),
        }

    # 3. Detect Modification Intent
    is_modification = AgentPolicies.is_modification_intent(text) or bool(state.get("modification_request"))
    modification_request = state.get("modification_request")
    if is_modification:
        mod_date_match = re.search(r"\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2})\b", text)
        mod_guests_match = re.search(r"(\d+)\s*(?:people|persons|guests|pax)", lower)
        new_date = mod_date_match.group(1).replace("/", "-") if mod_date_match else (modification_request.get("new_start_date") if modification_request else None)
        new_guests = int(mod_guests_match.group(1)) if mod_guests_match else (modification_request.get("new_guests_count") if modification_request else None)
        modification_request = {
            "new_start_date": new_date,
            "new_guests_count": new_guests,
        }

    # 4. Detect booking intent (or confirmed approval for booking)
    raw_booking_intent = AgentPolicies.is_explicit_booking_intent(text)
    is_booking_approved = (approval_status == "APPROVED" and approval_action == "BOOKING")
    booking_intent = raw_booking_intent or is_booking_approved

    # 5. Extract destination
    district = None
    for k, v in DISTRICT_SYNONYMS.items():
        if k in lower:
            district = v

            break

    # 6. Extract specific target date if mentioned
    target_date = None
    date_match = re.search(r"\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2})\b", text)
    if date_match:
        try:
            raw_d = date_match.group(1).replace("/", "-")
            parsed_d = datetime.strptime(raw_d, "%Y-%m-%d").date()
            target_date = parsed_d.strftime("%Y-%m-%d")
        except ValueError:
            target_date = None

    # 7. Extract duration days
    duration_days = 2
    duration_match = re.search(r"(\d+)\s*(?:day|days|night|nights)", lower)
    if duration_match:
        try:
            duration_days = max(1, min(14, int(duration_match.group(1))))
        except ValueError:
            duration_days = 2
    elif "weekend" in lower:
        duration_days = 2

    # 8. Extract party size / guests
    party_size = 2
    party_match = re.search(r"(\d+)\s*(?:people|persons|adults|guests|pax)", lower)
    if party_match:
        try:
            party_size = max(1, min(30, int(party_match.group(1))))
        except ValueError:
            party_size = 2
    elif "solo" in lower:
        party_size = 1
    elif "couple" in lower:
        party_size = 2

    # 9. Extract budget
    max_budget = None
    k_match = re.search(r"(?:₹|rs\.?|under|max|budget|below|to)\s*(\d+)\s*k\b", lower)
    if k_match:
        try:
            max_budget = float(k_match.group(1)) * 1000.0
        except ValueError:
            pass

    if max_budget is None:
        budget_match = re.search(r"(?:₹|rs\.?|under|max|budget(?:\s+to|\s+of|\s+under)?|below|to)\s*₹?\s*([\d,]{3,7})", lower)
        if budget_match:
            try:
                num_str = budget_match.group(1).replace(",", "")
                max_budget = float(num_str)
            except ValueError:
                pass

    # 10. Extract categories & preferences
    preferred_categories = []
    for k, cat in CATEGORY_KEYWORDS.items():
        if k in lower and cat not in preferred_categories:
            preferred_categories.append(cat)

    is_trip_plan = any(w in lower for w in [
        "plan", "itinerary", "itineraries", "day trip", "days trip", "weekend trip",
        "build trip", "create trip", "schedule", "tour", "vacation", "holiday",
    ])
    if duration_match and int(duration_match.group(1)) > 1 and "trip" in lower:
        is_trip_plan = True

    # Check for trip modification / refinement intents
    is_refinement = False
    refinement_action = None
    if any(w in lower for w in ["cheaper", "lower budget", "reduce budget", "reduce the budget", "budget to", "less expensive", "cut cost", "save money", "budget"]):
        is_refinement = True
        refinement_action = "REDUCE_BUDGET"
    elif any(w in lower for w in ["replace", "change activity", "swap", "another option", "different option", "alternative"]):
        is_refinement = True
        refinement_action = "REPLACE"
    elif any(w in lower for w in ["remove", "delete", "drop", "skip", "take out", "exclude"]):
        is_refinement = True
        refinement_action = "REMOVE"
    elif any(w in lower for w in ["hotel", "stay", "resort", "homestay", "cottage"]) and any(w in lower for w in ["change", "replace", "switch", "different", "another"]):
        is_refinement = True
        refinement_action = "CHANGE_HOTEL"
    elif any(w in lower for w in ["add", "include", "put in"]) and any(w in lower for w in ["food", "experience", "dinner", "lunch", "activity", "tour", "workshop", "cooking"]):
        is_refinement = True
        refinement_action = "ADD_ACTIVITY"

    is_trip_action = is_trip_plan or is_refinement or bool(re.search(r"day\s*\d+", lower))

    existing_reqs = state.get("extracted_requirements") or {}
    prev_date = existing_reqs.get("target_date")
    date_changed = bool(target_date and prev_date and target_date != prev_date)

    # Recover destination from active itinerary if not explicitly stated
    existing_dest = None
    if state.get("itinerary") and state["itinerary"].get("days"):
        for d in state["itinerary"]["days"]:
            for it in d.get("items", []):
                if it.get("district"):
                    existing_dest = it["district"]
                    break
            if existing_dest:
                break

    hard_constraints = {
        "destination_district": district or existing_reqs.get("destination_district") or existing_dest or ("Kodagu" if is_trip_plan else None),
        "target_date": target_date or existing_reqs.get("target_date"),
        "duration_days": duration_days or existing_reqs.get("duration_days", 2),
        "party_size": party_size or existing_reqs.get("party_size", 2),
        "max_budget": max_budget if max_budget is not None else existing_reqs.get("max_budget"),
    }

    soft_constraints = {
        "preferred_categories": preferred_categories or existing_reqs.get("preferred_categories", []),
        "keywords": [w for w in ["nature", "quiet", "coffee", "farm", "heritage", "adventure", "culture"] if w in lower],
        "pace": "PACKED" if "packed" in lower else ("RELAXED" if "relaxed" in lower else "MODERATE"),
    }

    requirements = {
        **hard_constraints,
        **soft_constraints,
        "date_changed": date_changed,
        "is_trip_plan": is_trip_plan,
        "is_refinement": is_refinement,
        "is_trip_action": is_trip_action,
        "refinement_action": refinement_action,
    }

    goal = text if text else "Assist traveler with Karnataka trip"

    trace = list(state.get("execution_trace", []))
    trace.append({
        "step": "UNDERSTANDING",
        "message": f"Parsed request: {hard_constraints.get('destination_district') or 'All Karnataka'} (Date: {hard_constraints.get('target_date') or 'Flexible'}, {hard_constraints.get('duration_days')}d, {hard_constraints.get('party_size')}pax, max budget: {hard_constraints.get('max_budget')})",
        "booking_intent": booking_intent,
        "is_cancellation": is_cancellation,
        "approval_status": approval_status,
    })

    return {
        "goal": goal,
        "hard_constraints": hard_constraints,
        "soft_constraints": soft_constraints,
        "extracted_requirements": requirements,
        "booking_intent": booking_intent,
        "approval_required": approval_required,
        "approval_status": approval_status,
        "approval_prompt": approval_prompt,
        "approval_action": approval_action,
        "cancellation_request": cancellation_request,
        "modification_request": modification_request,
        "availability_results": [] if date_changed else state.get("availability_results", []),
        "changed_items": [],
        "current_agent_step": "UNDERSTANDING",
        "execution_trace": trace,
    }


def load_user_context_node(state: AgentState, db: Session, user: User) -> Dict[str, Any]:
    """Node 2: Retrieve personal recommendations, travel preferences, wishlist, bookings, and interest profile."""
    marketplace_repo = MarketplaceRepository(db)
    trip_repo = TripRepository(db)
    booking_repo = BookingRepository(db)
    rec_repo = RecommendationRepository(db)

    # 1. Saved Services
    saved = marketplace_repo.list_saved_services(user.id)
    saved_services = [
        {
            "service_id": str(s.service.id),
            "title": s.service.title,
            "district": s.service.district,
            "price": float(s.service.price),
        }
        for s in saved if s.service
    ]

    # 2. Travel Preferences
    prefs = {}
    if getattr(user, "travel_preferences", None):
        try:
            prefs = json.loads(user.travel_preferences)
        except Exception:
            prefs = {}

    # 3. Recent Trips
    trips, _ = trip_repo.list_by_user(user.id, limit=3)
    recent_trips = [
        {"trip_id": str(t.id), "title": t.title, "destination": t.destination, "status": t.status}
        for t in trips
    ]

    # 4. Recent Bookings
    bookings, _ = booking_repo.list_by_user(user_id=user.id, limit=5)
    recent_bookings = [
        {
            "booking_id": str(b.id),
            "booking_code": getattr(b, "booking_code", getattr(b, "booking_number", "")),
            "service_id": str(b.service_id),
            "start_date": str(b.start_date) if b.start_date else None,
            "status": b.status,
            "total_amount": float(getattr(b, "final_amount", getattr(b, "total_amount", 0.0)) or 0.0),
        }
        for b in bookings
    ]

    # 5. Recommendation Profile
    interest_profile = rec_repo.get_user_profile(user.id)
    category_affinities = {}
    budget_band = {}
    if interest_profile:
        try:
            category_affinities = json.loads(interest_profile.category_affinity_json or "{}")
        except Exception:
            category_affinities = {}
        try:
            budget_band = json.loads(interest_profile.budget_band_json or "{}")
        except Exception:
            budget_band = {}

    is_cold_start = (
        not saved_services
        and not recent_trips
        and not recent_bookings
        and not interest_profile
        and not prefs
    )

    user_ctx = {
        "user_id": str(user.id),
        "full_name": user.full_name,
        "is_cold_start": is_cold_start,
        "travel_preferences": prefs,
        "saved_services": saved_services,
        "recent_trips": recent_trips,
        "recent_bookings": recent_bookings,
        "category_affinities": category_affinities,
        "budget_band": budget_band,
    }

    reqs = dict(state.get("extracted_requirements") or {})
    merged_interests = list(reqs.get("preferred_categories", []))
    if prefs.get("interests"):
        for it in prefs["interests"]:
            if it not in merged_interests:
                merged_interests.append(it)
    if category_affinities:
        top_affinity_cats = sorted(category_affinities.keys(), key=lambda k: category_affinities[k], reverse=True)[:3]
        for c in top_affinity_cats:
            if c not in merged_interests:
                merged_interests.append(c)

    reqs["preferred_categories"] = merged_interests

    trace = list(state.get("execution_trace", []))
    trace.append({
        "step": "LOADING_CONTEXT",
        "message": f"Loaded context for {user.full_name}: {'Cold-start profile' if is_cold_start else f'{len(saved_services)} saved, {len(recent_trips)} trips, {len(recent_bookings)} bookings'}.",
        "is_cold_start": is_cold_start,
    })

    return {
        "user_context": user_ctx,
        "extracted_requirements": reqs,
        "current_agent_step": "LOADING_CONTEXT",
        "execution_trace": trace,
    }


def decide_actions_node(state: AgentState, db: Session, user: User) -> Dict[str, Any]:
    """Node 3: Plan next step, evaluating goals, approvals, bookings, cancellations, and constraints."""
    booking_intent = state.get("booking_intent", False)
    is_cancellation = bool(state.get("cancellation_request"))
    is_modification = bool(state.get("modification_request"))
    approval_status = state.get("approval_status")
    approval_action = state.get("approval_action")
    reqs = state.get("extracted_requirements") or {}
    trace = list(state.get("execution_trace", []))

    if is_cancellation:
        if state.get("approval_status") != "APPROVED":
            booking_code = (state.get("cancellation_request") or {}).get("booking_code") or "your reservation"
            trace.append({
                "step": "APPROVAL_REQUIRED",
                "action": "CANCEL_BOOKING",
                "message": f"Consequential action: Cancellation of {booking_code} requires user approval.",
            })
            return {
                "approval_required": True,
                "approval_status": "PENDING",
                "approval_prompt": f"Please confirm if you want to cancel booking `{booking_code}`. An eligible refund calculation will be processed upon approval.",
                "approval_action": "CANCEL_BOOKING",
                "current_agent_step": "APPROVAL_REQUIRED",
                "execution_trace": trace,
            }
        else:
            trace.append({
                "step": "DECISION",
                "action": "EXECUTE_CANCELLATION",
                "message": "Directing to cancellation execution handler with confirmed approval.",
            })
            return {
                "current_agent_step": "BOOKING",
                "execution_trace": trace,
            }

    if is_modification:
        trace.append({
            "step": "DECISION",
            "action": "EXECUTE_MODIFICATION",
            "message": "Directing to booking modification handler.",
        })
        return {
            "current_agent_step": "BOOKING",
            "execution_trace": trace,
        }

    is_booking_approved = (approval_status == "APPROVED" and approval_action == "BOOKING")

    if is_booking_approved:
        trace.append({
            "step": "DECISION",
            "action": "EXECUTE_BOOKING",
            "message": "User explicitly confirmed booking approval. Directing to authoritative booking reservation handler.",
        })
        return {
            "current_agent_step": "BOOKING",
            "execution_trace": trace,
        }

    if booking_intent:
        trace.append({
            "step": "DECISION",
            "action": "CHECK_BOOKING_READINESS",
            "message": "Validating trip booking readiness, checking real inventory availability, and calculating total cost.",
        })
        return {
            "current_agent_step": "BOOKING",
            "execution_trace": trace,
        }


    is_trip_plan = reqs.get("is_trip_plan", False)
    is_refinement = reqs.get("is_refinement", False)
    has_active_trip = bool(state.get("itinerary") or state.get("trip_id"))

    if is_trip_plan or is_refinement or (has_active_trip and reqs.get("is_trip_action")):
        trace.append({
            "step": "DECISION",
            "action": "ROUTE_TO_TRIP_PLANNER",
            "message": f"Routing trip {'modification' if (is_refinement or has_active_trip) else 'planning'} request to specialized Trip Planner workflow for {reqs.get('destination_district') or 'Karnataka'}.",
        })
        return {
            "current_agent_step": "TRIP_PLANNER",
            "execution_trace": trace,
        }

    trace.append({
        "step": "DECISION",
        "action": "SEARCH_MARKETPLACE",
        "message": f"Searching marketplace for {reqs.get('destination_district') or 'Karnataka'}.",
    })
    return {
        "current_agent_step": "SEARCHING",
        "execution_trace": trace,
    }


def tool_execution_node(state: AgentState, db: Session, user: User) -> Dict[str, Any]:
    """Node 4: Execute real marketplace search, ranking, and availability verification for general travel requests."""
    reqs = state.get("extracted_requirements") or {}
    user_ctx = state.get("user_context") or {}
    district = reqs.get("destination_district")
    budget = reqs.get("max_budget")
    target_date = reqs.get("target_date") or (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
    trace = list(state.get("execution_trace", []))

    marketplace_repo = MarketplaceRepository(db)
    rec_repo = RecommendationRepository(db)
    rec_service = RecommendationService(rec_repo, marketplace_repo)

    # 1. Search Marketplace Services with district grounding
    if district:
        services, total = marketplace_repo.search_services(
            district=district,
            max_price=budget,
            page=1,
            page_size=12,
        )
    else:
        services, total = marketplace_repo.search_services(
            max_price=budget,
            page=1,
            page_size=12,
        )

    budget_too_low = False
    min_price_in_district = None
    if not services and budget is not None:
        unfiltered_services, _ = marketplace_repo.search_services(
            district=district,
            page=1,
            page_size=5,
        )
        if unfiltered_services:
            budget_too_low = True
            min_price_in_district = min(float(s.price) for s in unfiltered_services)
            trace.append({
                "step": "BUDGET_CONFLICT",
                "message": f"No services found under ₹{budget} in {district}. Lowest available verified option starts at ₹{min_price_in_district:,.2f}.",
                "min_available_price": min_price_in_district,
            })

    # 2. Get Personalized Recommendations
    personalized = rec_service.get_personalized_recommendations(
        user_id=user.id,
        limit=5,
        context={"district": district} if district else {},
    )
    personalized_ids = {r.get("id") for r in personalized}

    # 3. Filter and Rank Candidates
    pref_cats = set(reqs.get("preferred_categories", []))
    category_affinities = user_ctx.get("category_affinities", {})
    req_text = (state.get("current_user_request") or "").lower()

    def candidate_score(s):
        score = float(s.rating or 4.0) * 10
        if str(s.id) in personalized_ids:
            score += 25
        if s.category_slug in pref_cats or s.category in pref_cats:
            score += 30
        if s.category_slug in category_affinities:
            score += float(category_affinities[s.category_slug]) * 20
        title_lower = (s.title or "").lower()
        title_tokens = [w for w in re.findall(r"\w+", title_lower) if len(w) > 3 and w not in ["coorg", "estate", "stay", "tour", "camp", "villa", "home"]]
        lexical_matches = sum(1 for w in title_tokens if w in req_text)
        if lexical_matches > 0:
            score += lexical_matches * 50
        return score

    party_size = reqs.get("party_size", 2)
    valid_services = [
        s for s in services
        if s.status == "PUBLISHED" and (not party_size or s.max_capacity is None or s.max_capacity >= party_size)
    ]
    valid_services.sort(key=candidate_score, reverse=True)

    found_list = []
    for s in valid_services:
        found_list.append({
            "id": str(s.id),
            "title": s.title,
            "category": s.category,
            "category_slug": s.category_slug,
            "location": s.location,
            "district": s.district,
            "price": float(s.price),
            "unit": s.unit,
            "rating": float(s.rating),
            "provider_name": s.provider_name,
            "primary_image": s.primary_image,
        })

    # 4. Check real-time availability for top candidates
    avail_results = []
    for item in found_list[:4]:
        avail = AgentPolicies.verify_real_availability(
            db=db,
            service_id=item["id"],
            start_date=target_date,
            guests_count=party_size,
        )
        avail_results.append({
            "service_id": item["id"],
            "title": item["title"],
            "date": target_date,
            "available": avail["available"],
            "available_spots": avail.get("available_spots", 0),
            "price_override": avail.get("price_override"),
            "reason": avail.get("reason"),
        })

    trace.append({
        "step": "SEARCH_COMPLETED",
        "message": f"Found {len(found_list)} listings in {district or 'Karnataka'}. Verified availability for {len(avail_results)} listings.",
        "results_count": len(found_list),
    })

    return {
        "search_candidates": found_list,
        "search_results": found_list,
        "selected_services": found_list[:4],
        "availability_results": avail_results,
        "budget_too_low": budget_too_low,
        "min_price_in_district": min_price_in_district,
        "current_agent_step": "SEARCHING",
        "execution_trace": trace,
    }


def trip_planner_node(state: AgentState, db: Session, user: User) -> Dict[str, Any]:
    """Node 5: Specialized sub-workflow delegating itinerary synthesis, modification, and validation to AgenticTripPlanner."""
    from app.modules.ai.trip_planner.orchestrator import AgenticTripPlanner
    from app.modules.ai.trip_planner.state import PlannerState
    from app.modules.ai.trip_planner.handoff import BookingHandoffGenerator

    reqs = state.get("extracted_requirements") or {}
    message = state.get("current_user_request") or ""
    trace = list(state.get("execution_trace", []))
    active_trip_id = state.get("trip_id")

    # 1. Recover PlannerState from state if available
    current_planner_state: Optional[PlannerState] = None
    if state.get("itinerary"):
        current_planner_state = PlannerState.from_dict({
            "constraints": state.get("hard_constraints") or reqs,
            "proposal": state.get("itinerary"),
            "associated_trip_id": active_trip_id,
            "user_id": str(user.id),
        })

    # 2. Delegate to the specialized trip_planner workflow
    planner = AgenticTripPlanner(db=db)
    planner_state, changed_items = planner.handle_trip_turn(
        user=user,
        current_state=current_planner_state,
        message=message,
        extracted_requirements=reqs,
        existing_trip_id=active_trip_id,
    )

    if not planner_state.proposal:
        if planner_state.clarification_questions:
            trace.append({
                "step": "CLARIFICATION_REQUIRED",
                "message": planner_state.clarification_questions[0],
            })
        return {
            "current_agent_step": "SEARCHING",
            "execution_trace": trace,
        }

    proposal = planner_state.proposal
    duration = len(proposal.days)
    party_size = planner_state.constraints.party_size or reqs.get("party_size", 2)
    budget = planner_state.constraints.max_budget

    # Compute live budget breakdown math
    stay_cost = sum(it.estimated_price for d in proposal.days for it in d.items if "stay" in (it.category_slug or it.category or "").lower())
    act_cost = sum(it.estimated_price for d in proposal.days for it in d.items if "stay" not in (it.category_slug or it.category or "").lower())
    food_est = 600.0 * party_size * duration
    trans_est = 500.0 * duration
    total_b = proposal.total_estimated_cost
    remaining_b = (budget - total_b) if budget is not None else None

    budget_summary = {
        "stay": stay_cost,
        "activities": act_cost,
        "food": food_est,
        "transport": trans_est,
        "total": total_b,
        "remaining": remaining_b,
        "max_budget": budget,
    }

    val_report = planner_state.validation_report
    is_valid = val_report.is_valid if val_report else True
    budget_conflict = bool(budget is not None and proposal.total_estimated_cost > budget)

    handoff_payload = BookingHandoffGenerator.generate_handoff_payload(
        state=planner_state,
        trip_id=planner_state.associated_trip_id,
    )

    search_results = [
        {
            "id": it.service_id,
            "title": it.title,
            "category": it.category,
            "category_slug": it.category_slug,
            "location": it.location,
            "district": it.district,
            "price": it.estimated_price,
            "rating": it.rating,
            "provider_name": it.provider_name,
            "primary_image": it.primary_image,
        }
        for d in proposal.days
        for it in d.items
        if it.service_id
    ]

    trace.append({
        "step": "TRIP_PLANNER_EXECUTED",
        "action": "PLAN_OR_REFINE_ITINERARY",
        "message": f"Trip Planner synthesized {duration}-day itinerary (Total: ₹{proposal.total_estimated_cost:,.2f}, Valid: {is_valid and not budget_conflict}). Trip ID: {planner_state.associated_trip_id}",
        "trip_id": planner_state.associated_trip_id,
        "changed_items_count": len(changed_items),
    })

    return {
        "itinerary": proposal.to_dict(),
        "budget": budget_summary,
        "changed_items": changed_items,
        "trip_id": planner_state.associated_trip_id,
        "itinerary_valid": is_valid and not budget_conflict,
        "budget_conflict": budget_conflict,
        "min_feasible_cost": proposal.total_estimated_cost,
        "booking_plan": handoff_payload,
        "search_results": search_results or state.get("search_results", []),
        "current_agent_step": "BUILDING_ITINERARY",
        "execution_trace": trace,
    }


# Backwards compatibility alias
itinerary_and_trip_node = trip_planner_node


def booking_node(state: AgentState, db: Session, user: User) -> Dict[str, Any]:
    """Node 6: Handle bookings, cancellations, post-booking modifications, and idempotent notifications."""
    trace = list(state.get("execution_trace", []))
    trip_id = state.get("trip_id")
    errors = list(state.get("errors", []))

    marketplace_repo = MarketplaceRepository(db)
    booking_repo = BookingRepository(db)
    payment_repo = PaymentRepository(db)
    notif_repo = NotificationRepository(db)
    booking_service = BookingService(booking_repo, marketplace_repo)
    payment_service = PaymentService(payment_repo, booking_repo)
    notif_service = NotificationService(notif_repo)

    # ── A. Handle Cancellation Request ──
    cancel_req = state.get("cancellation_request")
    if cancel_req:
        booking_code = cancel_req.get("booking_code")
        # Locate booking by code or customer's latest booking
        target_booking = None
        if booking_code:
            target_booking = booking_repo.get_by_code(booking_code)
            if not target_booking:
                try:
                    target_booking = booking_repo.get_by_id(booking_code)
                except Exception:
                    pass

        if not target_booking:
            user_bookings, _ = booking_repo.list_by_user(user_id=user.id, limit=1)
            if user_bookings:
                target_booking = user_bookings[0]

        if not target_booking:
            err_msg = "Could not locate the booking to cancel. Please provide your booking number."
            errors.append(err_msg)
            return {
                "errors": errors,
                "booking_state": {"success": False, "error": err_msg},
                "current_agent_step": "BOOKING",
                "execution_trace": trace,
            }

        try:
            cancelled = booking_service.cancel_booking(
                user=user,
                booking_id=str(target_booking.id),
                reason=cancel_req.get("reason", "Cancelled via Namma AI"),
            )
            # Dispatch cancellation email and in-app notification
            refund_amt = cancelled.get("refund_amount", 0.0)
            b_code = getattr(target_booking, "booking_code", getattr(target_booking, "booking_number", ""))
            if user.email:
                svc_title = target_booking.service.title if target_booking.service else "Rural Experience"
                EmailService.send_cancellation_email(
                    to_email=user.email,
                    booking_code=b_code,
                    service_title=svc_title,
                    refund_amount=refund_amt,
                    is_test_data=getattr(user, "is_synthetic", False),
                    user_id=user.id,
                    db=db,
                )
            notif_service.create_notification(
                user_id=user.id,
                title="Booking Cancelled",
                message=f"Booking #{b_code} has been cancelled. Eligible refund: ₹{refund_amt:,.2f}.",
                notification_type="BOOKING",
            )

            booking_state = {
                "success": True,
                "action": "CANCELLED",
                "booking_id": str(target_booking.id),
                "booking_code": b_code,
                "refund_amount": refund_amt,
                "status": "CANCELLED",
            }
            trace.append({
                "step": "BOOKING_CANCELLED",
                "message": f"Cancelled booking #{b_code} (Refund: ₹{refund_amt:,.2f}).",
            })
            return {
                "booking_state": booking_state,
                "approval_required": False,
                "approval_prompt": None,
                "approval_action": None,
                "current_agent_step": "BOOKING",
                "execution_trace": trace,
            }
        except Exception as e:
            err_msg = f"Cancellation failed: {str(e)}"
            errors.append(err_msg)
            return {
                "errors": errors,
                "booking_state": {"success": False, "error": err_msg},
                "current_agent_step": "BOOKING",
                "execution_trace": trace,
            }

    # ── B. Handle Modification Request ──
    mod_req = state.get("modification_request")
    if mod_req:
        user_bookings, _ = booking_repo.list_by_user(user_id=user.id, limit=1)
        if user_bookings:
            target_booking = user_bookings[0]
            if mod_req.get("new_start_date"):
                target_booking.start_date = datetime.strptime(mod_req["new_start_date"], "%Y-%m-%d").date()
            if mod_req.get("new_guests_count"):
                target_booking.guests_count = mod_req["new_guests_count"]
            db.commit()
            booking_state = {
                "success": True,
                "action": "MODIFIED",
                "booking_id": str(target_booking.id),
                "booking_code": target_booking.booking_number,
                "start_date": str(target_booking.start_date),
                "guests_count": target_booking.guests_count,
                "status": target_booking.status,
            }
            trace.append({"step": "BOOKING_MODIFIED", "message": f"Updated booking #{target_booking.booking_number}."})
            return {
                "booking_state": booking_state,
                "current_agent_step": "BOOKING",
                "execution_trace": trace,
            }

    # ── C. Handle Booking Readiness Check vs Confirmed Booking Creation ──
    reqs = state.get("extracted_requirements") or {}
    approval_status = state.get("approval_status")
    approval_action = state.get("approval_action")
    is_booking_approved = (approval_status == "APPROVED" and approval_action == "BOOKING")

    target_start_date = reqs.get("target_date") or (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
    target_guests = reqs.get("party_size", 2)
    itin = state.get("itinerary")

    # Reconstruct proposal from Trip model if missing in memory
    if (not itin or not itin.get("days")) and trip_id:
        try:
            db_trip = db.query(Trip).filter(Trip.id == uuid.UUID(trip_id)).first()
            if db_trip:
                p_state = PlannerState.from_trip_model(db_trip)
                if p_state.proposal:
                    itin = p_state.proposal.to_dict()
        except Exception:
            pass

    # ── PHASE 1: Booking Readiness Check (when not yet approved by user) ──
    if not is_booking_approved:
        trace.append({
            "step": "BOOKING_READINESS_CHECK",
            "message": "Validating active trip items, real-time inventory availability, and authoritative prices.",
        })

        if not itin or not itin.get("days"):
            target_service_id = None
            if state.get("selected_services"):
                target_service_id = state["selected_services"][0].get("id")
            if not target_service_id:
                district = reqs.get("destination_district") or "Kodagu"
                services, _ = marketplace_repo.search_services(district=district, page_size=1)
                if services:
                    target_service_id = str(services[0].id)

            if not target_service_id:
                err_msg = "Could not identify which service or trip plan to book. Please specify a stay or experience."
                errors.append(err_msg)
                trace.append({"step": "BOOKING_READINESS_FAILED", "error": err_msg})
                return {
                    "errors": errors,
                    "booking_state": {"success": False, "error": err_msg},
                    "current_agent_step": "BOOKING",
                    "execution_trace": trace,
                }

            # Single service readiness verification
            try:
                svc = AgentPolicies.verify_real_service(db, target_service_id)
                avail = AgentPolicies.verify_real_availability(
                    db=db,
                    service_id=target_service_id,
                    start_date=target_start_date,
                    guests_count=target_guests,
                )
                if not avail["available"]:
                    reason = avail.get("reason", "Requested date slot is not available.")
                    trace.append({"step": "AVAILABILITY_CHECK_FAILED", "service": svc.title, "reason": reason})
                    return {
                        "approval_required": False,
                        "approval_prompt": None,
                        "approval_action": None,
                        "booking_state": {
                            "success": False,
                            "readiness": "UNAVAILABLE",
                            "unavailable_service": svc.title,
                            "error": f"The selected service '{svc.title}' is no longer available for your dates ({reason}).",
                        },
                        "current_agent_step": "SEARCHING",
                        "execution_trace": trace,
                    }

                total_amount = avail.get("price_override") or float(svc.price)
                approval_prompt = (
                    f"Your booking for **{svc.title}** on {target_start_date} ({target_guests} guests) "
                    f"is verified and ready to book. Total amount: ₹{total_amount:,.2f}."
                )
                trace.append({
                    "step": "BOOKING_READINESS_VERIFIED",
                    "message": f"Verified availability for '{svc.title}'. Total amount: ₹{total_amount:,.2f}.",
                    "total_amount": total_amount,
                })
                return {
                    "approval_required": True,
                    "approval_status": "PENDING",
                    "approval_prompt": approval_prompt,
                    "approval_action": "BOOKING",
                    "current_agent_step": "APPROVAL_REQUIRED",
                    "execution_trace": trace,
                }
            except Exception as e:
                err_msg = f"Availability verification failed: {str(e)}"
                errors.append(err_msg)
                return {
                    "errors": errors,
                    "booking_state": {"success": False, "error": err_msg},
                    "current_agent_step": "BOOKING",
                    "execution_trace": trace,
                }

        # Multi-item trip plan readiness verification
        availability_failed = False
        failed_reason = None
        failed_title = None
        verified_items = []
        total_amount = 0.0

        for day in itin.get("days", []):
            for item in day.get("items", []):
                s_id = item.get("service_id")
                if not s_id:
                    continue
                item_date = item.get("date") or day.get("date") or target_start_date

                try:
                    svc = AgentPolicies.verify_real_service(db, s_id)
                    avail = AgentPolicies.verify_real_availability(
                        db=db,
                        service_id=s_id,
                        start_date=item_date,
                        guests_count=target_guests,
                    )
                except Exception as check_err:
                    availability_failed = True
                    failed_reason = str(check_err)
                    failed_title = item.get("title", "Selected Service")
                    break

                if not avail["available"]:
                    availability_failed = True
                    failed_reason = avail.get("reason", f"Not available on {item_date}")
                    failed_title = item.get("title", "Selected Service")
                    break

                item_price = avail.get("price_override") or item.get("estimated_price") or float(svc.price)
                total_amount += item_price
                verified_items.append({
                    "service_id": s_id,
                    "title": svc.title,
                    "category": item.get("category", svc.category),
                    "date": item_date,
                    "price": item_price,
                })

            if availability_failed:
                break

        if availability_failed:
            trace.append({
                "step": "BOOKING_READINESS_FAILED",
                "message": f"Availability check failed for '{failed_title}': {failed_reason}",
                "service": failed_title,
            })
            return {
                "approval_required": False,
                "approval_prompt": None,
                "approval_action": None,
                "booking_state": {
                    "success": False,
                    "readiness": "UNAVAILABLE",
                    "unavailable_service": failed_title,
                    "error": f"The selected service '{failed_title}' is no longer available for your dates ({failed_reason}).",
                },
                "current_agent_step": "SEARCHING",
                "execution_trace": trace,
            }

        if total_amount == 0 and itin.get("total_estimated_cost"):
            total_amount = float(itin["total_estimated_cost"])

        # Construct authoritative booking handoff payload
        handoff_payload = None
        try:
            p_state = PlannerState.from_dict({
                "constraints": reqs,
                "proposal": itin,
                "associated_trip_id": trip_id,
                "user_id": str(user.id),
            })
            handoff_payload = BookingHandoffGenerator.generate_handoff_payload(p_state, trip_id=trip_id)
        except Exception:
            pass

        dest = reqs.get("destination_district") or "Karnataka"
        duration = reqs.get("duration_days", len(itin.get("days", [])))
        start_d = reqs.get("target_date") or target_start_date
        end_d = None
        if start_d:
            try:
                end_d = (datetime.strptime(start_d, "%Y-%m-%d") + timedelta(days=max(1, duration - 1))).strftime("%Y-%m-%d")
            except Exception:
                end_d = start_d

        approval_prompt = (
            f"Your {duration}-day trip to {dest} ({start_d} to {end_d}, {target_guests} travelers) "
            f"is verified and ready to book. Total amount: ₹{total_amount:,.2f}."
        )

        trace.append({
            "step": "BOOKING_READINESS_VERIFIED",
            "message": f"Verified inventory availability for all {len(verified_items)} trip items. Total verified price: ₹{total_amount:,.2f}.",
            "total_amount": total_amount,
            "items_count": len(verified_items),
        })

        return {
            "approval_required": True,
            "approval_status": "PENDING",
            "approval_prompt": approval_prompt,
            "approval_action": "BOOKING",
            "current_agent_step": "APPROVAL_REQUIRED",
            "booking_plan": handoff_payload,
            "execution_trace": trace,
        }

    # ── PHASE 2: Authoritative Booking Execution (after explicit approval) ──
    target_service_id = None
    if itin and itin.get("days"):
        for d in itin["days"]:
            for item in d.get("items", []):
                if item.get("service_id"):
                    target_service_id = item["service_id"]
                    if item.get("date"):
                        target_start_date = item["date"]
                    break
            if target_service_id:
                break

    if not target_service_id and state.get("selected_services"):
        target_service_id = state["selected_services"][0].get("id")

    if not target_service_id:
        district = reqs.get("destination_district") or "Kodagu"
        services, _ = marketplace_repo.search_services(district=district, page_size=1)
        if services:
            target_service_id = str(services[0].id)

    if not target_service_id:
        err_msg = "Could not identify which service to book. Please specify a stay or experience."
        errors.append(err_msg)
        trace.append({"step": "BOOKING_FAILED", "error": err_msg})
        return {
            "errors": errors,
            "booking_state": {"success": False, "error": err_msg},
            "current_agent_step": "BOOKING",
            "execution_trace": trace,
        }

    try:
        # 1. Authoritative checks
        svc = AgentPolicies.verify_real_service(db, target_service_id)
        avail = AgentPolicies.verify_real_availability(
            db=db,
            service_id=target_service_id,
            start_date=target_start_date,
            guests_count=target_guests,
        )
        if not avail["available"]:
            err_msg = avail.get("reason", "Requested date slot is not available.")
            errors.append(err_msg)
            trace.append({"step": "BOOKING_FAILED", "error": err_msg})
            return {
                "errors": errors,
                "booking_state": {"success": False, "error": err_msg},
                "current_agent_step": "BOOKING",
                "execution_trace": trace,
            }

        # 2. Create Booking
        booking_payload = BookingCreateRequest(
            service_id=target_service_id,
            start_date=datetime.strptime(target_start_date, "%Y-%m-%d").date(),
            guests_count=target_guests,
            slot_time="09:00 AM",
            special_requests="Booked via Namma AI Agent",
        )
        booking_result = booking_service.create_booking(user=user, payload=booking_payload)

        # 3. Create Razorpay Payment Order (User manual payment gate)
        try:
            payment_order = payment_service.create_order(
                user=user,
                payload=CreateOrderRequest(booking_id=booking_result["id"]),
            )
        except Exception as p_err:
            err_msg = f"Payment order generation failed: {str(p_err)}"
            errors.append(err_msg)
            trace.append({"step": "PAYMENT_FAILED", "error": err_msg})
            return {
                "errors": errors,
                "booking_state": {"success": False, "error": err_msg, "booking_id": booking_result["id"]},
                "current_agent_step": "BOOKING",
                "execution_trace": trace,
            }

        # 4. Link booking to TripItem if trip exists
        if trip_id:
            try:
                trip = db.query(Trip).filter(Trip.id == uuid.UUID(trip_id)).first()
                if trip:
                    svc_uuid = uuid.UUID(target_service_id)
                    b_uuid = uuid.UUID(booking_result["id"])
                    for day in trip.days:
                        for item in day.items:
                            if item.service_id == svc_uuid:
                                item.booking_id = b_uuid
                                item.is_booked = True
                    db.commit()
            except Exception:
                pass

        # 5. Dispatch Idempotent In-App Notification & Email
        notif_service.create_notification(
            user_id=user.id,
            title="Booking Reserved",
            message=f"Your booking #{booking_result['booking_number']} for '{svc.title}' is reserved. Complete payment to secure check-in.",
            notification_type="BOOKING",
        )

        booking_state = {
            "success": True,
            "booking_id": booking_result["id"],
            "booking_code": booking_result["booking_number"],
            "service_id": target_service_id,
            "service_title": svc.title,
            "start_date": target_start_date,
            "guests_count": target_guests,
            "total_amount": booking_result["final_amount"],
            "status": booking_result["status"],
            "payment_order_id": payment_order.get("gateway_order_id"),
            "payment_status": booking_result.get("payment_status", "PENDING"),
            "requires_user_checkout": True,
            "created_at": booking_result["created_at"],
        }

        trace.append({
            "step": "BOOKING_CONFIRMED",
            "message": f"Successfully created booking {booking_result['booking_number']} for '{svc.title}' (Total: ₹{booking_result['final_amount']:.2f}). Payment order: {payment_order.get('gateway_order_id')}.",
            "booking_code": booking_result["booking_number"],
        })

        return {
            "booking_state": booking_state,
            "payment_status": "PENDING",
            "approval_required": False,
            "approval_status": None,
            "approval_action": None,
            "current_agent_step": "BOOKING",
            "execution_trace": trace,
        }

    except Exception as exc:
        err_msg = f"Booking failed: {str(exc)}"
        errors.append(err_msg)
        trace.append({"step": "BOOKING_FAILED", "error": err_msg})
        return {
            "errors": errors,
            "booking_state": {"success": False, "error": err_msg},
            "current_agent_step": "BOOKING",
            "execution_trace": trace,
        }


def respond_node(state: AgentState) -> Dict[str, Any]:
    """Node 7: Generate natural language response summarizing the agent's work without leaking trace/chain-of-thought."""
    booking_state = state.get("booking_state")
    itin = state.get("itinerary")
    budget = state.get("budget")
    reqs = state.get("extracted_requirements") or {}
    district = reqs.get("destination_district") or "Karnataka"
    search_results = state.get("search_results") or []
    trip_id = state.get("trip_id")
    approval_required = state.get("approval_required", False)
    approval_prompt = state.get("approval_prompt")
    approval_action = state.get("approval_action")
    approval_status = state.get("approval_status")

    lines = []

    # 1. Booking / Cancellation / Modification scenario
    if booking_state and booking_state.get("success"):
        action = booking_state.get("action")
        if action == "CANCELLED":
            b_code = booking_state.get("booking_code")
            refund = booking_state.get("refund_amount", 0.0)
            lines.append("✅ **Booking Cancelled Successfully**")
            lines.append(f"Your reservation `{b_code}` has been cancelled.")
            lines.append(f"- **Eligible Refund**: ₹{refund:,.2f}")
            lines.append("A confirmation email and in-app notification have been sent to you.")
        elif action == "MODIFIED":
            b_code = booking_state.get("booking_code")
            lines.append("✅ **Booking Updated**")
            lines.append(f"Your booking `{b_code}` has been updated to **{booking_state.get('start_date')}** for **{booking_state.get('guests_count')} guests**.")
        else:
            b_code = booking_state.get("booking_code")
            title = booking_state.get("service_title")
            amt = booking_state.get("total_amount")
            lines.append("🎉 **Reservation Prepared — Booking Confirmed!**")
            lines.append(f"I have reserved **{title}** for you.")
            lines.append(f"- **Booking Code**: `{b_code}`")
            lines.append(f"- **Date**: {booking_state.get('start_date')}")
            lines.append(f"- **Guests**: {booking_state.get('guests_count')}")
            lines.append(f"- **Total Amount**: ₹{amt:,.2f}")
            lines.append(f"- **Payment Order**: `{booking_state.get('payment_order_id')}`")
            lines.append("\n👉 **Please complete your payment via the checkout button to confirm your reservation.**")
            if trip_id:
                lines.append("Your trip schedule in **My Trips** has been linked with this booking.")

    elif booking_state and not booking_state.get("success"):
        if booking_state.get("readiness") == "UNAVAILABLE":
            lines.append("⚠️ **Item Unavailable for Booking**\n")
            lines.append(booking_state.get("error", "One of your selected services is no longer available."))
            lines.append("\nWould you like me to find another option or replace it with an alternative?")
        else:
            lines.append(f"⚠️ **Could not complete booking**: {booking_state.get('error')}")

    # 2. Human Approval Gate Prompt (Booking Readiness Summary)
    elif approval_required and approval_action == "BOOKING":
        lines.append("📋 **Your trip is ready to book.**\n")
        lines.append(f"• **Destination**: {district}")
        dur = reqs.get("duration_days") or (len(itin.get("days", [])) if itin else 2)
        if reqs.get("target_date"):
            try:
                s_date = datetime.strptime(reqs["target_date"], "%Y-%m-%d")
                e_date = s_date + timedelta(days=dur - 1)
                lines.append(f"• **Dates**: {s_date.strftime('%d %b')} – {e_date.strftime('%d %b')}")
            except Exception:
                lines.append(f"• **Dates**: {reqs['target_date']}")
        lines.append(f"• **Travelers**: {reqs.get('party_size', 2)}\n")

        if itin and itin.get("days"):
            stays = [it for d in itin["days"] for it in d.get("items", []) if "stay" in (it.get("category") or "").lower() or "stay" in (it.get("category_slug") or "").lower() or "hotel" in (it.get("category") or "").lower()]
            acts = [it for d in itin["days"] for it in d.get("items", []) if it not in stays]

            if stays:
                lines.append("🏨 **Stay**")
                for s in stays:
                    lines.append(f"• **{s.get('title')}** — ₹{s.get('estimated_price', 0):,.0f}")
                lines.append("")

            if acts:
                lines.append("🎯 **Activities & Experiences**")
                for a in acts:
                    lines.append(f"• **{a.get('title')}** — ₹{a.get('estimated_price', 0):,.0f}")
                lines.append("")

        total_cost = itin.get("total_estimated_cost", 0.0) if itin else (state.get("min_feasible_cost") or 0.0)
        lines.append(f"💰 **Total Amount**: **₹{total_cost:,.2f}**\n")
        lines.append("Please click **[Confirm & Book]** or say **'Confirm booking'** to proceed.")

    elif approval_required and approval_prompt:
        lines.append("📋 **Approval Required**\n")
        lines.append(approval_prompt)
        lines.append("\nPlease click **[Approve]** to proceed or **[Not Now]** to adjust.")

    elif approval_status == "REJECTED":
        lines.append("Booking postponed. You can continue customizing your itinerary, changing dates, or adjusting the budget anytime.")


    # 3. Itinerary scenario
    elif itin and itin.get("days"):
        total_cost = itin.get("total_estimated_cost", 0.0)
        days_count = len(itin.get("days", []))
        budget_val = reqs.get("max_budget")

        if state.get("budget_conflict") and not state.get("itinerary_valid", True):
            lines.append(f"⚠️ **Budget Constraint Alert**: A {days_count}-day itinerary in {district} cannot be fully satisfied within your budget cap of ₹{budget_val:,.2f}.")
            lines.append(f"The most affordable verified combination requires at least ₹{total_cost:,.2f}.\n")

        lines.append(f"Here is your personalized **{days_count}-Day {district} Itinerary**:\n")

        changed_set = set(state.get("changed_items", []))
        for d in itin.get("days", []):
            lines.append(f"### Day {d.get('day_number')}: {d.get('title')}")
            for it in d.get("items", []):
                price_str = f"₹{it.get('estimated_price', 0):,.0f}"
                time_str = f"{it.get('start_time')} - {it.get('end_time')}"
                badge = " ✦ UPDATED" if it.get("id") in changed_set else ""
                lines.append(f"- **{it.get('title')}**{badge} ({it.get('category')}): {time_str} | {price_str}")
                if it.get("notes"):
                    lines.append(f"  _{it.get('notes')}_")
            lines.append("")

        lines.append(f"💰 **Estimated Total Cost**: ₹{total_cost:,.2f}")
        if budget:
            lines.append(f"• Stay: ₹{budget.get('stay', 0):,.0f} | Activities: ₹{budget.get('activities', 0):,.0f} | Food (est): ₹{budget.get('food', 0):,.0f} | Transport (est): ₹{budget.get('transport', 0):,.0f}")
            if budget_val:
                if total_cost <= budget_val:
                    lines.append(f"✅ Remaining Budget: ₹{budget_val - total_cost:,.2f}")
                else:
                    lines.append(f"⚠️ Exceeds budget cap by ₹{total_cost - budget_val:,.2f}")

        lines.append("\nWhen you are ready, simply say **'Book it'** to reserve your stay and activities.")

    # 4. Search / Discovery scenario
    elif search_results:
        target_name = district if district else "Karnataka"
        lines.append(f"Here are top verified options I found in **{target_name}** tailored for you:\n")
        for s in search_results[:4]:
            lines.append(f"- **{s.get('title')}** in {s.get('district')} — ₹{s.get('price'):,.0f}/{s.get('unit', 'night')} (★ {s.get('rating')})")
        lines.append("\nWould you like me to build a multi-day itinerary around these or book one directly?")

    elif state.get("budget_too_low") or state.get("budget_conflict"):
        min_p = state.get("min_price_in_district") or state.get("min_feasible_cost")
        budget_val = reqs.get("max_budget", 0.0)
        lines.append(f"⚠️ **Budget Constraint Alert**: A {reqs.get('duration_days', 2)}-day trip in {district} cannot be fully satisfied within your budget cap of ₹{budget_val:,.2f}.")
        if min_p:
            lines.append(f"The most affordable verified options in {district} start around ₹{min_p:,.2f}.")
        lines.append("Would you like to adjust your budget cap or explore more economical alternatives?")

    else:
        if district:
            lines.append(f"I searched our marketplace but found no available stays or verified services in {district} matching your request.")
        else:
            lines.append("I am ready to help you plan and book authentic Karnataka travel experiences! Tell me where you'd like to go, your travel dates, and budget.")

    response_text = "\n".join(lines)

    trace = list(state.get("execution_trace", []))
    trace.append({
        "step": "COMPLETED",
        "message": "Generated final agent response.",
    })

    return {
        "response_content": response_text,
        "messages": [AIMessage(content=response_text)],
        "current_agent_step": "COMPLETED",
        "execution_trace": trace,
    }
