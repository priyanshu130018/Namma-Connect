import { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  Navigation,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  Clock,
  Compass,
  Shield,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

export interface MapMarker {
  id?: string;
  lat: number;
  lon: number;
  title?: string;
  subtitle?: string;
  isPrivate?: boolean;
}

export interface RouteInfo {
  distanceText?: string;
  durationText?: string;
  routePoints?: Array<{ lat: number; lon: number }>;
}

export interface TomTomMapProps {
  center?: { lat: number; lon: number };
  zoom?: number;
  markers?: MapMarker[];
  route?: RouteInfo;
  height?: string;
  className?: string;
  interactive?: boolean;
  theme?: "light" | "dark" | "auto";
  privacyProtected?: boolean;
  onDirectionsClick?: () => void;
  errorState?: string | null;
  isLoading?: boolean;
}

export function TomTomMap({
  center = { lat: 12.9716, lon: 77.5946 },
  zoom: initialZoom = 12,
  markers = [],
  route,
  height = "380px",
  className = "",
  interactive = true,
  theme = "auto",
  privacyProtected = false,
  onDirectionsClick,
  errorState = null,
  isLoading = false,
}: TomTomMapProps) {
  const { t } = useTranslation();
  const [zoomLevel, setZoomLevel] = useState<number>(initialZoom);
  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lon: number }>(center);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentCenter(center);
  }, [center.lat, center.lon]);

  const activeMarker = useMemo(() => {
    if (markers.length === 0) return null;
    if (activeMarkerId) {
      return markers.find((m) => m.id === activeMarkerId) || markers[0];
    }
    return markers[0];
  }, [markers, activeMarkerId]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 1, 18));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 1, 4));
  const handleRecenter = () => {
    setCurrentCenter(center);
    setZoomLevel(initialZoom);
  };

  const handleOpenExternalMaps = () => {
    const targetLat = activeMarker ? activeMarker.lat : center.lat;
    const targetLon = activeMarker ? activeMarker.lon : center.lon;
    const url = `https://www.google.com/maps/search/?api=1&query=${targetLat},${targetLon}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (errorState) {
    return (
      <div
        style={{ height }}
        className={`relative w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6 flex flex-col items-center justify-center text-center space-y-3 ${className}`}
      >
        <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t("map.mapUnavailable")}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">{errorState}</p>
        </div>
        {onDirectionsClick && (
          <Button variant="outline" size="sm" onClick={onDirectionsClick} className="mt-2 text-xs font-bold">
            <Navigation className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
            {t("map.getDirections")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ height }}
      data-theme={theme}
      className={`relative w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 text-white shadow-md select-none group ${className}`}
    >
      {/* ── Vector Grid Canvas Simulation ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 opacity-95">
        <svg className="w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="tomtom-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-700" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#tomtom-grid)" />
        </svg>
      </div>

      {/* ── Route Line Overlay ── */}
      {route?.routePoints && route.routePoints.length >= 2 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <polyline
            points="150,220 230,180 340,160 480,120"
            fill="none"
            stroke="#10b981"
            strokeWidth="4"
            strokeDasharray="6,4"
            className="animate-pulse"
          />
        </svg>
      )}

      {/* ── Map Markers ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        {markers.length > 0 ? (
          markers.map((m, idx) => (
            <div
              key={m.id || idx}
              className="pointer-events-auto cursor-pointer transform hover:scale-110 transition-transform flex flex-col items-center"
              onClick={() => setActiveMarkerId(m.id || `${idx}`)}
            >
              <div className="px-3 py-1 rounded-full bg-slate-900/90 border border-emerald-500 text-[11px] font-bold text-emerald-400 shadow-xl backdrop-blur-md mb-1.5 flex items-center gap-1.5">
                <Compass className="h-3 w-3 text-emerald-400" />
                <span>{m.title || "Service Location"}</span>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="h-9 w-9 rounded-full bg-emerald-500/20 animate-ping absolute" />
                <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900">
                  <MapPin className="h-5 w-5 fill-white/20" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="pointer-events-auto flex flex-col items-center">
            <div className="px-3 py-1 rounded-full bg-slate-900/90 border border-emerald-500 text-[11px] font-bold text-emerald-400 shadow-xl backdrop-blur-md mb-1.5">
              <span>{currentCenter.lat.toFixed(4)}, {currentCenter.lon.toFixed(4)}</span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
              <MapPin className="h-5 w-5" />
            </div>
          </div>
        )}
      </div>

      {/* ── Top Bar Controls & Badges ── */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-[11px] font-medium text-slate-200 flex items-center gap-1.5 shadow-lg">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <span>TomTom Orbis ({currentCenter.lat.toFixed(2)}, {currentCenter.lon.toFixed(2)}) • {zoomLevel}x</span>
          </div>

          {privacyProtected && (
            <div className="px-2.5 py-1 rounded-xl bg-emerald-950/80 backdrop-blur-md border border-emerald-800 text-[11px] font-medium text-emerald-300 flex items-center gap-1.5 shadow-lg">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span>Approximate Location</span>
            </div>
          )}
        </div>

        {route?.distanceText && route?.durationText && (
          <div className="pointer-events-auto px-3 py-1.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 text-xs font-bold text-emerald-400 flex items-center gap-3 shadow-xl">
            <div className="flex items-center gap-1">
              <Navigation className="h-3.5 w-3.5" />
              <span>{route.distanceText}</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1 text-slate-200">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>{route.durationText}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Floating Controls ── */}
      <div className="absolute bottom-3 left-3 right-3 z-30 flex items-end justify-between pointer-events-none">
        {/* Left Side: External Directions Button */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={handleOpenExternalMaps}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs font-bold text-slate-200 backdrop-blur-md border border-slate-700 flex items-center gap-1.5 shadow-lg transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            <span>{t("map.openInMaps")}</span>
          </button>

          {onDirectionsClick && (
            <button
              onClick={onDirectionsClick}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg flex items-center gap-1.5 transition-colors"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>{t("map.getDirections")}</span>
            </button>
          )}
        </div>

        {/* Right Side: Zoom & Recenter Controls */}
        {interactive && (
          <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-lg">
            <button
              onClick={handleZoomIn}
              aria-label="Zoom in"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={handleZoomOut}
              aria-label="Zoom out"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-slate-700 mx-0.5" />
            <button
              onClick={handleRecenter}
              aria-label="Recenter map"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Loading Overlay ── */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 shadow-2xl">
            <div className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>{t("map.loadingMap")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
