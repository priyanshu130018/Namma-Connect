"""TomTom Location Services endpoints for Geocoding, Reverse Geocoding, Routing, and Places Search."""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.schemas.common import APIResponse
from app.services.location import LocationService
from app.core.rate_limiter import rate_limit

router = APIRouter(prefix="/location", tags=["Location Services"])


@router.get("/geocode", response_model=APIResponse[Dict[str, Any]], dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60, key_prefix="location_geocode"))])
def geocode_address(
    q: str = Query(..., min_length=2, description="City, address, or landmark query string"),
    country_code: str = Query("IN", description="ISO country code (default IN for India)"),
):
    """
    Geocode an address or place query using TomTom Geocoding API.
    Returns latitude, longitude, formatted address, district, state, and postal code.
    """
    res = LocationService.geocode_location(q, country_code=country_code)
    return APIResponse(
        success=True,
        message="Location geocoded successfully",
        data=res,
    )


@router.get("/reverse-geocode", response_model=APIResponse[Dict[str, Any]], dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60, key_prefix="location_rev_geocode"))])
def reverse_geocode_coordinates(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude degree"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude degree"),
):
    """
    Reverse geocode latitude and longitude coordinates to formatted address and locality.
    """
    res = LocationService.reverse_geocode(lat, lon)
    return APIResponse(
        success=True,
        message="Coordinates reverse-geocoded successfully",
        data=res,
    )


@router.get("/route", response_model=APIResponse[Dict[str, Any]], dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60, key_prefix="location_route"))])
def calculate_route(
    origin_lat: float = Query(..., ge=-90.0, le=90.0, description="Origin latitude"),
    origin_lon: float = Query(..., ge=-180.0, le=180.0, description="Origin longitude"),
    dest_lat: float = Query(..., ge=-90.0, le=90.0, description="Destination latitude"),
    dest_lon: float = Query(..., ge=-180.0, le=180.0, description="Destination longitude"),
    travel_mode: str = Query("car", description="Travel mode: car, bicycle, pedestrian"),
):
    """
    Calculate driving/travel route between origin and destination using TomTom Routing API.
    Returns distance (km), duration (mins), and polyline route coordinates.
    """
    res = LocationService.calculate_route(
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        travel_mode=travel_mode,
    )
    return APIResponse(
        success=True,
        message="Route calculated successfully",
        data=res,
    )


@router.get("/search", response_model=APIResponse[List[Dict[str, Any]]], dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60, key_prefix="location_search"))])
def search_places(
    q: str = Query(..., min_length=2, description="Place or landmark search query"),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Optional user proximity latitude"),
    lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Optional user proximity longitude"),
    limit: int = Query(5, ge=1, le=20, description="Maximum number of search results"),
):
    """
    Search external places and landmarks using TomTom Places API.
    """
    results = LocationService.search_places(query=q, lat=lat, lon=lon, limit=limit)
    return APIResponse(
        success=True,
        message="Places retrieved successfully",
        data=results,
    )
