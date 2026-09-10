import { apiClient } from "./api-client";

export interface GeocodeResult {
  lat: number;
  lon: number;
  display_name: string;
  formatted_address: string;
  district?: string;
  state?: string;
  locality?: string;
  postal_code?: string;
  provider: string;
}

export interface ReverseGeocodeResult {
  lat: number;
  lon: number;
  display_name: string;
  formatted_address: string;
  district?: string;
  state?: string;
  locality?: string;
  postal_code?: string;
  country?: string;
  provider: string;
}

export interface RoutePoint {
  lat: number;
  lon: number;
}

export interface RouteResult {
  success: boolean;
  distance_meters: number;
  distance_km: number;
  distance_text: string;
  duration_seconds: number;
  duration_minutes: number;
  duration_text: string;
  traffic_delay_seconds: number;
  travel_mode: string;
  route_points: RoutePoint[];
  provider: string;
}

export interface PlaceSearchResult {
  id: string;
  name: string;
  formatted_address: string;
  locality?: string;
  district?: string;
  state?: string;
  lat: number;
  lon: number;
}

export async function geocodeLocation(query: string, countryCode: string = "IN"): Promise<GeocodeResult> {
  const resp = await apiClient.get("/location/geocode", {
    params: { q: query, country_code: countryCode },
  });
  return resp.data.data;
}

export async function reverseGeocodeLocation(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const resp = await apiClient.get("/location/reverse-geocode", {
    params: { lat, lon },
  });
  return resp.data.data;
}

export async function calculateRoute(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  travelMode: string = "car"
): Promise<RouteResult> {
  const resp = await apiClient.get("/location/route", {
    params: {
      origin_lat: originLat,
      origin_lon: originLon,
      dest_lat: destLat,
      dest_lon: destLon,
      travel_mode: travelMode,
    },
  });
  return resp.data.data;
}

export async function searchPlaces(
  query: string,
  lat?: number,
  lon?: number,
  limit: number = 5
): Promise<PlaceSearchResult[]> {
  const resp = await apiClient.get("/location/search", {
    params: { q: query, lat, lon, limit },
  });
  return resp.data.data;
}
