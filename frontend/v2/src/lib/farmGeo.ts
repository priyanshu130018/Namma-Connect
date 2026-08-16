/**
 * Geo helpers for map features (OpenStreetMap + Leaflet).
 * Provides coordinate lookup for farms (real coords when present, otherwise
 * a city lookup or a deterministic fallback) and haversine distance.
 */

export type LatLng = { latitude: number; longitude: number };

/** Well-known coordinates for the regions our farm data references. */
export const CITY_COORDS: Record<string, LatLng> = {
  coorg: { latitude: 12.4244, longitude: 75.7382 },
  madikeri: { latitude: 12.4244, longitude: 75.7382 },
  kuttanad: { latitude: 9.4981, longitude: 76.3388 },
  alleppey: { latitude: 9.4246, longitude: 76.3388 },
  munnar: { latitude: 10.0889, longitude: 77.0595 },
  chikkaballapur: { latitude: 13.4355, longitude: 77.7315 },
  nandi: { latitude: 13.3702, longitude: 77.6835 },
  sagara: { latitude: 14.1674, longitude: 75.0403 },
  malnad: { latitude: 14.1674, longitude: 75.0403 },
  ratnagiri: { latitude: 16.9902, longitude: 73.312 },
  konkan: { latitude: 16.9902, longitude: 73.312 },
  bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  bangalore: { latitude: 12.9716, longitude: 77.5946 },
  kochi: { latitude: 9.9312, longitude: 76.2673 },
  mysuru: { latitude: 12.2958, longitude: 76.6394 },
  goa: { latitude: 15.2993, longitude: 74.124 },
  wayanad: { latitude: 11.6854, longitude: 76.132 },
};

/** India-centered default view for pickers. */
export const INDIA_CENTER: LatLng = { latitude: 21.8, longitude: 78.5 };

/** Fallback anchor when the user denies geolocation. */
export const DEFAULT_POINT: LatLng = CITY_COORDS["bengaluru"]!;

type FarmLike = {
  id?: string | number;
  name?: string;
  farm_name?: string;
  location?: string;
  city?: string;
  state?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

/**
 * Resolve a farm's coordinates:
 * 1. Explicit latitude/longitude on the record.
 * 2. City/region lookup from location strings.
 * 3. Deterministic jitter around Karnataka (stable per farm id).
 */
export function getFarmCoords(farm: FarmLike | null | undefined): LatLng {
  const lat = Number(farm?.latitude);
  const lng = Number(farm?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return { latitude: lat, longitude: lng };
  }

  const haystack = [farm?.location, farm?.city, farm?.state, farm?.name, farm?.farm_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  for (const key of Object.keys(CITY_COORDS)) {
    if (haystack.includes(key)) return CITY_COORDS[key]!;
  }

  const seed = String(farm?.id ?? farm?.name ?? farm?.farm_name ?? "farm")
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return {
    latitude: 11.8 + (seed % 45) / 10,
    longitude: 75.2 + (seed % 55) / 10,
  };
}

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Google Maps deep link (no API key — plain share URL). */
export function googleMapsUrl(p: LatLng): string {
  return `https://www.google.com/maps?q=${p.latitude},${p.longitude}`;
}
