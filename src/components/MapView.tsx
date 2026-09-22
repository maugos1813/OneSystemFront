import { APIProvider, Map, Marker, Polyline } from "@vis.gl/react-google-maps";
import type { Position, Vehicle } from "../lib/types";

interface MapViewProps {
  vehicles: Vehicle[];
  positions: Record<string, Position>;
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
  historyPath?: Position[];
}

const DEFAULT_CENTER = { lat: 41.9028, lng: 12.4964 }; // Roma, como fallback sin posiciones aún

export function MapView({
  vehicles,
  positions,
  selectedVehicleId,
  onSelectVehicle,
  historyPath,
}: MapViewProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const knownPositions = vehicles
    .map((v) => positions[v.id])
    .filter((p): p is Position => p !== undefined);

  const center = (selectedVehicleId && positions[selectedVehicleId]) ?? knownPositions[0] ?? null;

  if (!apiKey) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-slate-100 text-sm text-slate-500">
        Falta configurar VITE_GOOGLE_MAPS_API_KEY para mostrar el mapa.
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        className="h-full flex-1"
        defaultCenter={center ? { lat: center.lat, lng: center.lng } : DEFAULT_CENTER}
        defaultZoom={center ? 14 : 4}
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        {historyPath && historyPath.length > 1 && (
          <Polyline
            path={historyPath.map((p) => ({ lat: p.lat, lng: p.lng }))}
            strokeColor="#2563eb"
            strokeOpacity={0.8}
            strokeWeight={4}
          />
        )}

        {vehicles.map((vehicle) => {
          const position = positions[vehicle.id];
          if (!position) return null;

          return (
            <Marker
              key={vehicle.id}
              position={{ lat: position.lat, lng: position.lng }}
              title={vehicle.name}
              onClick={() => onSelectVehicle(vehicle.id)}
              opacity={vehicle.id === selectedVehicleId ? 1 : 0.75}
            />
          );
        })}
      </Map>
    </APIProvider>
  );
}
