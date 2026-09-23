import { APIProvider, Map, Marker, Polyline } from "@vis.gl/react-google-maps";
import { MUTED_MAP_STYLE } from "../../lib/mapStyle";
import { buildRouteSegments } from "../../lib/speedTimeline";
import type { Position } from "../../lib/types";

interface HistoryMapViewProps {
  positions: Position[];
  currentPosition: Position | null;
  speedLimit: number;
}

function currentPositionIcon(overLimit: boolean): google.maps.Symbol | undefined {
  if (typeof google === "undefined" || !google.maps?.SymbolPath) return undefined;
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: overLimit ? "#dc2626" : "#7c3aed",
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2.5,
  };
}

/** A deliberately spare map: the route as a couple of colored segments plus a single
 * marker for the current playback position — no swarm of per-point pins. */
export function HistoryMapView({ positions, currentPosition, speedLimit }: HistoryMapViewProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Falta configurar VITE_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  const segments = buildRouteSegments(positions, speedLimit);
  const center = currentPosition ?? positions[0]!;

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        className="h-full"
        center={{ lat: center.lat, lng: center.lng }}
        defaultZoom={14}
        gestureHandling="greedy"
        disableDefaultUI
        styles={MUTED_MAP_STYLE}
      >
        {segments.map((segment, i) => (
          <Polyline
            key={i}
            path={segment.path}
            strokeColor={segment.violation ? "#dc2626" : "#3b82f6"}
            strokeOpacity={0.85}
            strokeWeight={segment.violation ? 5 : 4}
          />
        ))}

        {currentPosition && (
          <Marker
            position={{ lat: currentPosition.lat, lng: currentPosition.lng }}
            icon={currentPositionIcon(currentPosition.speed > speedLimit)}
          />
        )}
      </Map>
    </APIProvider>
  );
}
