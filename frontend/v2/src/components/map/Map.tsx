/**
 * SSR-safe map entry point.
 * Leaflet is browser-only, so the actual map module is loaded lazily and only
 * rendered after mount. Import maps from here — never from LeafletMap.tsx.
 */
import { Suspense, lazy, useEffect, useState, type ComponentProps } from "react";
import { FiMap } from "react-icons/fi";
import type { LatLng } from "@/lib/farmGeo";

const LazyLocationPicker = lazy(() =>
  import("./LeafletMap").then((m) => ({ default: m.LocationPicker })),
);
const LazyFarmLocationMap = lazy(() =>
  import("./LeafletMap").then((m) => ({ default: m.FarmLocationMap })),
);
const LazyFarmsOverviewMap = lazy(() =>
  import("./LeafletMap").then((m) => ({ default: m.FarmsOverviewMap })),
);

type PickerProps = ComponentProps<typeof LazyLocationPicker>;
type DetailProps = ComponentProps<typeof LazyFarmLocationMap>;
type OverviewProps = ComponentProps<typeof LazyFarmsOverviewMap>;

export function MapSkeleton({ height = 400 }: { height?: number | undefined }) {
  return (
    <div
      style={{ height }}
      className="flex w-full animate-pulse flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-muted text-muted-foreground"
      aria-label="Loading map"
    >
      <FiMap size={26} />
      <span className="text-xs font-medium">Loading map…</span>
    </div>
  );
}

function ClientGate({ height, children }: { height?: number | undefined; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <MapSkeleton height={height} />;
  return <Suspense fallback={<MapSkeleton height={height} />}>{children}</Suspense>;
}

/** Farmer side — click anywhere on the map to drop the farm pin. */
export function LocationPickerMap(props: PickerProps) {
  return (
    <ClientGate height={props.height}>
      <LazyLocationPicker {...props} />
    </ClientGate>
  );
}

/** Tourist side — farm details map with marker + popup. */
export function FarmLocationMap(props: DetailProps) {
  return (
    <ClientGate height={props.height}>
      <LazyFarmLocationMap {...props} />
    </ClientGate>
  );
}

/** Tourist side — all farms as clickable markers on Explore. */
export function FarmsOverviewMap(props: OverviewProps) {
  return (
    <ClientGate height={props.height}>
      <LazyFarmsOverviewMap {...props} />
    </ClientGate>
  );
}

export type { LatLng };
