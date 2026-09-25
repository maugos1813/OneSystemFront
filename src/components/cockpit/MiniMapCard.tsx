import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { useSmoothedPosition } from "../../hooks/useSmoothedPosition";
import { MUTED_MAP_STYLE } from "../../lib/mapStyle";
import { getVehicleIcon } from "../../lib/markerIcon";
import type { Position } from "../../lib/types";

export function MiniMapCard({ position }: { position: Position | null }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const smoothed = useSmoothedPosition(position);

  if (!apiKey || !position || !smoothed) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-slate-400">
        {position ? "Falta configurar el mapa." : "Sin ubicación todavía."}
      </div>
    );
  }

  return (
    <div className="h-full min-h-[220px] overflow-hidden rounded-xl">
      <APIProvider apiKey={apiKey}>
        <Map
          className="h-full"
          center={{ lat: smoothed.lat, lng: smoothed.lng }}
          defaultZoom={15}
          gestureHandling="greedy"
          disableDefaultUI
          styles={MUTED_MAP_STYLE}
        >
          <Marker
            position={{ lat: smoothed.lat, lng: smoothed.lng }}
            icon={getVehicleIcon({ ...position, angle: smoothed.angle })}
          />
        </Map>
      </APIProvider>
    </div>
  );
}
