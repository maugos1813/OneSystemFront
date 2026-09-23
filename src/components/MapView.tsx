import { APIProvider, Map, Marker, Polyline } from "@vis.gl/react-google-maps";
import { getVehicleIcon } from "../lib/markerIcon";
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
    <div className="relative h-full flex-1">
      <APIProvider apiKey={apiKey}>
        <Map
          className="h-full"
          defaultCenter={center ? { lat: center.lat, lng: center.lng } : DEFAULT_CENTER}
          defaultZoom={center ? 14 : 4}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {historyPath && historyPath.length > 1 && (
            <Polyline
              path={historyPath.map((p) => ({ lat: p.lat, lng: p.lng }))}
              strokeColor="#7c3aed"
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
                icon={getVehicleIcon(position)}
              />
            );
          })}
        </Map>
      </APIProvider>

      <MapLegend />
    </div>
  );
}

function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-0 flex flex-col gap-1.5 rounded-lg border border-violet-100 bg-white px-2.5 py-2 text-[11px] text-slate-600 shadow sm:px-3 sm:text-xs">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
        Apagado
      </div>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
        Encendido, detenido
      </div>
      <div className="flex items-center gap-2">
        <span className="text-green-600">▲</span>
        En movimiento
      </div>
    </div>
  );
}
