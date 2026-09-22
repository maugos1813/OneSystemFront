import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { DARK_MAP_STYLE } from "../../lib/darkMapStyle";
import { getVehicleIcon } from "../../lib/markerIcon";
import type { Position, Vehicle } from "../../lib/types";

const DEFAULT_CENTER = { lat: 41.9028, lng: 12.4964 };

export function FleetMap({
  vehicles,
  positions,
}: {
  vehicles: Vehicle[];
  positions: Record<string, Position>;
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const known = vehicles.map((v) => positions[v.id]).filter((p): p is Position => p !== undefined);
  const center = known[0] ?? null;

  if (!apiKey) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-zinc-500">
        Falta configurar VITE_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  return (
    <div className="h-80 overflow-hidden rounded-lg">
      <APIProvider apiKey={apiKey}>
        <Map
          className="h-full"
          defaultCenter={center ? { lat: center.lat, lng: center.lng } : DEFAULT_CENTER}
          defaultZoom={center ? 12 : 4}
          gestureHandling="greedy"
          disableDefaultUI
          styles={DARK_MAP_STYLE}
        >
          {vehicles.map((vehicle) => {
            const position = positions[vehicle.id];
            if (!position) return null;
            return (
              <Marker
                key={vehicle.id}
                position={{ lat: position.lat, lng: position.lng }}
                title={vehicle.name}
                icon={getVehicleIcon(position)}
              />
            );
          })}
        </Map>
      </APIProvider>
    </div>
  );
}
