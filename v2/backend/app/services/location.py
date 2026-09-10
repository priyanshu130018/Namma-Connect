"""TomTom Location Services Integration for NammaConnect V2.

Provides authoritative location services including Geocoding, Reverse Geocoding,
Route Calculation, and Place Search powered by TomTom Orbis APIs with Redis caching,
rate limiting support, resilient timeout handling, and fallback capabilities.
"""

import json
import math
import urllib.parse
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import settings
from app.core.logging import logger
from app.services.redis_service import RedisService


class LocationService:
    """Authoritative TomTom Location, Geocoding, and Routing Service."""

    # Default timeout for external HTTP calls (seconds)
    TIMEOUT_SECONDS = 5.0

    # Regional fallbacks for offline development or missing credentials
    KNOWN_CLUSTERS = {
        "coorg": {"lat": 12.3375, "lon": 75.8069, "display": "Madikeri, Coorg, Karnataka, India", "district": "Coorg", "state": "Karnataka"},
        "wayanad": {"lat": 11.6854, "lon": 76.1320, "display": "Wayanad, Kerala, India", "district": "Wayanad", "state": "Kerala"},
        "chikmagalur": {"lat": 13.3161, "lon": 75.7720, "display": "Chikmagalur, Karnataka, India", "district": "Chikmagalur", "state": "Karnataka"},
        "sakleshpur": {"lat": 12.9438, "lon": 75.7868, "display": "Sakleshpur, Hassan, Karnataka, India", "district": "Hassan", "state": "Karnataka"},
        "mysore": {"lat": 12.2958, "lon": 76.6394, "display": "Mysuru, Karnataka, India", "district": "Mysuru", "state": "Karnataka"},
        "hampi": {"lat": 15.3350, "lon": 76.4600, "display": "Hampi, Vijayanagara, Karnataka, India", "district": "Vijayanagara", "state": "Karnataka"},
        "bengaluru": {"lat": 12.9716, "lon": 77.5946, "display": "Bengaluru, Karnataka, India", "district": "Bengaluru", "state": "Karnataka"},
        "bangalore": {"lat": 12.9716, "lon": 77.5946, "display": "Bengaluru, Karnataka, India", "district": "Bengaluru", "state": "Karnataka"},
    }

    @classmethod
    def _get_api_key(cls) -> str:
        return settings.TOMTOM_API_KEY.strip()

    @classmethod
    def _get_base_url(cls) -> str:
        return settings.TOMTOM_BASE_URL.rstrip("/")

    @classmethod
    def geocode_location(cls, query: str, country_code: str = "IN") -> Dict[str, Any]:
        """
        Geocode an address or place query to latitude/longitude using TomTom Geocoding API.
        Results are cached in Redis for 1 hour (3600s).
        """
        if not query or not query.strip():
            return cls._fallback_geocode("Bengaluru")

        q_clean = query.strip()
        cache_key = f"tomtom:geocode:{q_clean.lower()}"

        # 1. Check Redis cache
        cached = RedisService.get(cache_key)
        if cached:
            try:
                return json.loads(cached) if isinstance(cached, str) else cached
            except Exception:
                pass

        # 2. Check local registry first for known destination clusters for speed & consistency
        q_lower = q_clean.lower()
        for key, info in cls.KNOWN_CLUSTERS.items():
            if key == q_lower:
                res = {
                    "lat": info["lat"],
                    "lon": info["lon"],
                    "display_name": info["display"],
                    "formatted_address": info["display"],
                    "district": info["district"],
                    "state": info["state"],
                    "provider": "nammaconnect_registry",
                }
                RedisService.set(cache_key, json.dumps(res), expire_seconds=3600)
                return res

        api_key = cls._get_api_key()
        if api_key and api_key != "dummy_tomtom_api_key_for_dev":
            try:
                encoded_q = urllib.parse.quote(q_clean)
                url = f"{cls._get_base_url()}/search/2/geocode/{encoded_q}.json?key={api_key}&countrySet={country_code}&limit=1"
                
                with httpx.Client(timeout=cls.TIMEOUT_SECONDS) as client:
                    resp = client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        results = data.get("results", [])
                        if results:
                            first = results[0]
                            pos = first.get("position", {})
                            addr = first.get("address", {})
                            res = {
                                "lat": float(pos.get("lat", 12.9716)),
                                "lon": float(pos.get("lon", 77.5946)),
                                "display_name": addr.get("freeformAddress") or q_clean,
                                "formatted_address": addr.get("freeformAddress") or q_clean,
                                "locality": addr.get("municipality") or addr.get("municipalitySubdivision"),
                                "district": addr.get("secondarySubdivision") or addr.get("municipality") or "Karnataka",
                                "state": addr.get("countrySubdivision") or "Karnataka",
                                "postal_code": addr.get("postalCode"),
                                "provider": "tomtom",
                            }
                            RedisService.set(cache_key, json.dumps(res), expire_seconds=3600)
                            return res
            except Exception as e:
                logger.warning(f"TomTom geocode request failed for '{query}': {e}. Using fallback.")

        # 3. Fallback to cluster matching or default
        return cls._fallback_geocode(q_clean)

    @classmethod
    def _fallback_geocode(cls, query: str) -> Dict[str, Any]:
        q_lower = query.lower()
        for name, info in cls.KNOWN_CLUSTERS.items():
            if name in q_lower:
                return {
                    "lat": info["lat"],
                    "lon": info["lon"],
                    "display_name": info["display"],
                    "formatted_address": info["display"],
                    "district": info["district"],
                    "state": info["state"],
                    "provider": "regional_fallback",
                }

        return {
            "lat": 12.9716,
            "lon": 77.5946,
            "display_name": f"{query}, Karnataka, India",
            "formatted_address": f"{query}, Karnataka, India",
            "district": "Bengaluru",
            "state": "Karnataka",
            "provider": "default_regional",
        }

    @classmethod
    def reverse_geocode(cls, lat: float, lon: float) -> Dict[str, Any]:
        """
        Reverse geocode latitude/longitude coordinates to address details using TomTom.
        """
        cache_key = f"tomtom:rev_geocode:{round(lat, 4)}:{round(lon, 4)}"
        cached = RedisService.get(cache_key)
        if cached:
            try:
                return json.loads(cached) if isinstance(cached, str) else cached
            except Exception:
                pass

        api_key = cls._get_api_key()
        if api_key and api_key != "dummy_tomtom_api_key_for_dev":
            try:
                url = f"{cls._get_base_url()}/search/2/reverseGeocode/{lat},{lon}.json?key={api_key}"
                with httpx.Client(timeout=cls.TIMEOUT_SECONDS) as client:
                    resp = client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        addresses = data.get("addresses", [])
                        if addresses:
                            addr = addresses[0].get("address", {})
                            res = {
                                "lat": lat,
                                "lon": lon,
                                "formatted_address": addr.get("freeformAddress") or f"{lat}, {lon}",
                                "display_name": addr.get("freeformAddress") or f"{lat}, {lon}",
                                "locality": addr.get("municipality") or addr.get("municipalitySubdivision"),
                                "district": addr.get("secondarySubdivision") or addr.get("municipality") or "Karnataka",
                                "state": addr.get("countrySubdivision") or "Karnataka",
                                "postal_code": addr.get("postalCode"),
                                "country": addr.get("country", "India"),
                                "provider": "tomtom",
                            }
                            RedisService.set(cache_key, json.dumps(res), expire_seconds=3600)
                            return res
            except Exception as e:
                logger.warning(f"TomTom reverse geocode failed for ({lat}, {lon}): {e}")

        res = {
            "lat": lat,
            "lon": lon,
            "formatted_address": f"Location near ({round(lat, 4)}, {round(lon, 4)}), Karnataka",
            "display_name": f"Location near ({round(lat, 4)}, {round(lon, 4)})",
            "district": "Karnataka",
            "state": "Karnataka",
            "provider": "fallback",
        }
        return res

    @classmethod
    def calculate_route(
        cls,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        travel_mode: str = "car",
    ) -> Dict[str, Any]:
        """
        Calculate route, distance (km), travel time (mins), and path geometry using TomTom Routing API.
        Cache TTL: 300 seconds (5 mins) to account for fresh traffic data.
        """
        cache_key = f"tomtom:route:{round(origin_lat, 3)}:{round(origin_lon, 3)}:{round(dest_lat, 3)}:{round(dest_lon, 3)}:{travel_mode}"
        cached = RedisService.get(cache_key)
        if cached:
            try:
                return json.loads(cached) if isinstance(cached, str) else cached
            except Exception:
                pass

        api_key = cls._get_api_key()
        if api_key and api_key != "dummy_tomtom_api_key_for_dev":
            try:
                url = (
                    f"{cls._get_base_url()}/routing/1/calculateRoute/"
                    f"{origin_lat},{origin_lon}:{dest_lat},{dest_lon}/json"
                    f"?key={api_key}&travelMode={travel_mode}"
                )
                with httpx.Client(timeout=cls.TIMEOUT_SECONDS) as client:
                    resp = client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        routes = data.get("routes", [])
                        if routes:
                            route = routes[0]
                            summary = route.get("summary", {})
                            meters = summary.get("lengthInMeters", 0)
                            seconds = summary.get("travelTimeInSeconds", 0)
                            traffic_delay = summary.get("trafficDelayInSeconds", 0)

                            km = round(meters / 1000.0, 1)
                            mins = math.ceil((seconds + traffic_delay) / 60.0)

                            # Extract route polyline points
                            legs = route.get("legs", [])
                            points = []
                            if legs:
                                for pt in legs[0].get("points", []):
                                    points.append({
                                        "lat": pt.get("latitude"),
                                        "lon": pt.get("longitude"),
                                    })

                            res = {
                                "success": True,
                                "distance_meters": meters,
                                "distance_km": km,
                                "distance_text": f"{km} km",
                                "duration_seconds": seconds,
                                "duration_minutes": mins,
                                "duration_text": f"~{mins} min",
                                "traffic_delay_seconds": traffic_delay,
                                "travel_mode": travel_mode,
                                "route_points": points,
                                "provider": "tomtom",
                            }
                            RedisService.set(cache_key, json.dumps(res), expire_seconds=300)
                            return res
            except Exception as e:
                logger.warning(f"TomTom routing failed for ({origin_lat},{origin_lon}) -> ({dest_lat},{dest_lon}): {e}")

        # Fallback straight-line (Haversine) calculation if API unavailable
        return cls._fallback_route(origin_lat, origin_lon, dest_lat, dest_lon, travel_mode)

    @classmethod
    def _fallback_route(
        cls,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        travel_mode: str,
    ) -> Dict[str, Any]:
        """Estimate straight-line distance and approximate drive time as resilient fallback."""
        R = 6371.0  # Earth radius in km
        lat1, lon1, lat2, lon2 = map(math.radians, [origin_lat, origin_lon, dest_lat, dest_lon])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat / 2.0) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        direct_km = R * c

        # Road distance factor (~1.3x straight-line in South Indian terrain)
        road_km = round(direct_km * 1.3, 1)
        # Average road speed ~ 40 km/h
        duration_mins = max(1, math.ceil((road_km / 40.0) * 60))

        return {
            "success": True,
            "distance_meters": int(road_km * 1000),
            "distance_km": road_km,
            "distance_text": f"{road_km} km",
            "duration_seconds": duration_mins * 60,
            "duration_minutes": duration_mins,
            "duration_text": f"~{duration_mins} min",
            "traffic_delay_seconds": 0,
            "travel_mode": travel_mode,
            "route_points": [
                {"lat": origin_lat, "lon": origin_lon},
                {"lat": dest_lat, "lon": dest_lon},
            ],
            "provider": "haversine_fallback",
        }

    @classmethod
    def search_places(
        cls,
        query: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Search external places and landmarks using TomTom Places API.
        """
        if not query or not query.strip():
            return []

        q_clean = query.strip()
        cache_key = f"tomtom:places:{q_clean.lower()}:{round(lat or 0, 2)}:{round(lon or 0, 2)}"
        cached = RedisService.get(cache_key)
        if cached:
            try:
                return json.loads(cached) if isinstance(cached, str) else cached
            except Exception:
                pass

        api_key = cls._get_api_key()
        if api_key and api_key != "dummy_tomtom_api_key_for_dev":
            try:
                encoded_q = urllib.parse.quote(q_clean)
                url = f"{cls._get_base_url()}/search/2/search/{encoded_q}.json?key={api_key}&countrySet=IN&limit={limit}"
                if lat is not None and lon is not None:
                    url += f"&lat={lat}&lon={lon}"

                with httpx.Client(timeout=cls.TIMEOUT_SECONDS) as client:
                    resp = client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        results = []
                        for item in data.get("results", []):
                            pos = item.get("position", {})
                            addr = item.get("address", {})
                            poi = item.get("poi", {})
                            name = poi.get("name") or addr.get("freeformAddress") or q_clean
                            results.append({
                                "id": item.get("id"),
                                "name": name,
                                "formatted_address": addr.get("freeformAddress") or name,
                                "locality": addr.get("municipality"),
                                "district": addr.get("secondarySubdivision") or addr.get("municipality"),
                                "state": addr.get("countrySubdivision") or "Karnataka",
                                "lat": float(pos.get("lat", 0.0)),
                                "lon": float(pos.get("lon", 0.0)),
                            })
                        if results:
                            RedisService.set(cache_key, json.dumps(results), expire_seconds=3600)
                            return results
            except Exception as e:
                logger.warning(f"TomTom places search failed for '{query}': {e}")

        # Fallback local match
        fallbacks = []
        for key, info in cls.KNOWN_CLUSTERS.items():
            if key in q_clean.lower() or q_clean.lower() in key:
                fallbacks.append({
                    "id": f"cluster_{key}",
                    "name": info["display"].split(",")[0],
                    "formatted_address": info["display"],
                    "locality": info["display"].split(",")[0],
                    "district": info["district"],
                    "state": info["state"],
                    "lat": info["lat"],
                    "lon": info["lon"],
                })
        return fallbacks