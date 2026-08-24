"""OpenStreetMap (OSM) / Nominatim Location Integration for NammaConnect V2."""

import json
import urllib.parse
import urllib.request
from typing import Any, Dict
from app.core.logging import logger


class LocationService:
    """OpenStreetMap geocoding, reverse geocoding, and location lookup service."""

    KNOWN_CLUSTERS = {
        "coorg": {"lat": 12.3375, "lon": 75.8069, "display": "Madikeri, Coorg, Karnataka, India"},
        "wayanad": {"lat": 11.6854, "lon": 76.1320, "display": "Wayanad, Kerala, India"},
        "chikmagalur": {"lat": 13.3161, "lon": 75.7720, "display": "Chikmagalur, Karnataka, India"},
        "sakleshpur": {"lat": 12.9438, "lon": 75.7868, "display": "Sakleshpur, Hassan, Karnataka, India"},
        "mysore": {"lat": 12.2958, "lon": 76.6394, "display": "Mysuru, Karnataka, India"},
        "hampi": {"lat": 15.3350, "lon": 76.4600, "display": "Hampi, Vijayanagara, Karnataka, India"},
    }

    @classmethod
    def geocode_location(cls, query: str) -> Dict[str, Any]:
        """Geocode city/place name using OpenStreetMap Nominatim or verified fallback registry."""
        q_clean = query.lower().strip()

        # 1. Check known cluster registry
        for name, coords in cls.KNOWN_CLUSTERS.items():
            if name in q_clean:
                return {
                    "lat": coords["lat"],
                    "lon": coords["lon"],
                    "display_name": coords["display"],
                    "provider": "nammaconnect_osm_registry",
                }

        # 2. Query Nominatim API with polite user-agent
        try:
            url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&format=json&limit=1&countrycodes=in"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "NammaConnect-Platform/2.0 (contact@nammaconnect.in)"},
            )
            with urllib.request.urlopen(req, timeout=4) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data and len(data) > 0:
                    first = data[0]
                    return {
                        "lat": float(first["lat"]),
                        "lon": float(first["lon"]),
                        "display_name": first.get("display_name", query),
                        "provider": "openstreetmap_nominatim",
                    }
        except Exception as e:
            logger.info(f"OSM Nominatim lookup error: {e}. Using regional default.")

        # Default to Bengaluru regional coordinates
        return {
            "lat": 12.9716,
            "lon": 77.5946,
            "display_name": f"{query}, Karnataka, India",
            "provider": "default_regional",
        }