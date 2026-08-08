/**
 * Browser-only Leaflet map implementations (react-leaflet + OpenStreetMap).
 * Never import this file directly from routes — it is loaded lazily through
 * `@/components/map/Map` so SSR never evaluates Leaflet on the server.
 */
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { INDIA_CENTER, distanceKm, type LatLng } from "@/lib/farmGeo";

const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

/* Themed pin rendered as a div icon — avoids bundler issues with Leaflet's
   default marker image assets and stays dark-mode / role-color compatible. */
const pinIcon = (modifier = "") =>
  L.divIcon({
    className: "nc-pin",
    html: `<span class="nc-pin-dot ${modifier}"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });

const farmPin = pinIcon();
const accentPin = pinIcon("nc-pin-dot--accent");
const userPin = pinIcon("nc-pin-dot--user");

function ClickToSelect({ onSelect }: { onSelect: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onSelect({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ center, zoom }: { center: LatLng; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.latitude, center.longitude], zoom ?? map.getZoom());
  }, [center.latitude, center.longitude, zoom, map]);
  return null;
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0]!.latitude, points[0]!.longitude], 9);
      return;
    }
    map.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number])), {
      padding: [40, 40],
    });
  }, [points, map]);
  return null;
}

const mapStyle = (height: number): React.CSSProperties => ({ height, width: "100%" });

/* ── Farmer: click-to-pick location ─────────────────────────────────────── */

export function LocationPicker({
  value,
  onChange,
  height = 400,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  height?: number;
}) {
  return (
    <MapContainer
      center={[value?.latitude ?? INDIA_CENTER.latitude, value?.longitude ?? INDIA_CENTER.longitude]}
      zoom={value ? 11 : 5}
      style={mapStyle(height)}
      scrollWheelZoom
    >
      <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
      <ClickToSelect onSelect={onChange} />
      {value ? (
        <>
          <Recenter center={value} />
          <Marker position={[value.latitude, value.longitude]} icon={farmPin} />
        </>
      ) : null}
    </MapContainer>
  );
}

/* ── Tourist: single farm on the details page ───────────────────────────── */

export function FarmLocationMap({
  center,
  name,
  location,
  height = 400,
}: {
  center: LatLng;
  name: string;
  location?: string;
  height?: number;
}) {
  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={11}
      style={mapStyle(height)}
      scrollWheelZoom
    >
      <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
      <Recenter center={center} zoom={11} />
      <Marker position={[center.latitude, center.longitude]} icon={farmPin}>
        <Popup>
          <div className="nc-map-popup">
            <strong>{name}</strong>
            {location ? <span>{location}</span> : null}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}

/* ── Tourist: all farms overview on Explore ─────────────────────────────── */

export type MapFarm = {
  id: string | number;
  name: string;
  location: string;
  price?: number;
  rating?: number;
  coords: LatLng;
};

export function FarmsOverviewMap({
  farms,
  userLocation,
  height = 420,
}: {
  farms: MapFarm[];
  userLocation?: LatLng | null;
  height?: number;
}) {
  const points = [...farms.map((f) => f.coords), ...(userLocation ? [userLocation] : [])];
  return (
    <MapContainer
      center={[INDIA_CENTER.latitude, INDIA_CENTER.longitude]}
      zoom={5}
      style={mapStyle(height)}
      scrollWheelZoom
    >
      <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
      <FitBounds points={points.length > 0 ? points : [INDIA_CENTER]} />
      {farms.map((f) => (
        <Marker key={f.id} position={[f.coords.latitude, f.coords.longitude]} icon={farmPin}>
          <Popup>
            <div className="nc-map-popup">
              <strong>{f.name}</strong>
              <span>{f.location}</span>
              {typeof f.price === "number" ? <span>₹{f.price.toLocaleString("en-IN")} / night</span> : null}
              {typeof f.rating === "number" ? <span>★ {f.rating.toFixed(1)}</span> : null}
              {userLocation ? (
                <span className="nc-map-distance">
                  ~{Math.round(distanceKm(userLocation, f.coords))} km from you
                </span>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}
      {userLocation ? (
        <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userPin}>
          <Popup>
            <div className="nc-map-popup">
              <strong>You are here</strong>
            </div>
          </Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}

export const markerIcons = { farmPin, accentPin, userPin };
