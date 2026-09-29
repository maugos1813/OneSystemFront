import { APIProvider, Map, Marker, Polyline, useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useSmoothedPosition } from "../hooks/useSmoothedPosition";
import { DARK_MAP_STYLE } from "../lib/mapStyle";
import { getVehicleIcon } from "../lib/markerIcon";
import type { Position, Vehicle } from "../lib/types";

const FOCUS_ZOOM = 15;

/** Pans (and zooms in on) the selected vehicle's position whenever the selection
 * changes, so picking one out of a cluster of markers doesn't require manually hunting
 * for it on the map. Only reacts to the selection changing, not to every position
 * update, so it doesn't fight the user's own panning while a vehicle keeps moving. */
function MapCenterOnSelect({
  selectedVehicleId,
  positions,
}: {
  selectedVehicleId: string | null;
  positions: Record<string, Position>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !selectedVehicleId) return;
    const position = positions[selectedVehicleId];
    if (!position) return;
    map.panTo({ lat: position.lat, lng: position.lng });
    if ((map.getZoom() ?? 0) < FOCUS_ZOOM) map.setZoom(FOCUS_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the selection changes
  }, [map, selectedVehicleId]);

  return null;
}

interface MapViewProps {
  vehicles: Vehicle[];
  positions: Record<string, Position>;
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
  historyPath?: Position[];
}

const DEFAULT_CENTER = { lat: 41.9028, lng: 12.4964 }; // Roma, como fallback sin posiciones aún

interface AnimatedVehicleMarkerProps {
  vehicle: Vehicle;
  position: Position;
  selected: boolean;
  onSelect: (vehicleId: string) => void;
}

/** Glides between real reports instead of snapping — see useSmoothedPosition. Split out
 * so each vehicle's animation is its own hook instance, independent of the others. */
function AnimatedVehicleMarker({ vehicle, position, selected, onSelect }: AnimatedVehicleMarkerProps) {
  const smoothed = useSmoothedPosition(position);
  if (!smoothed) return null;

  return (
    <Marker
      position={{ lat: smoothed.lat, lng: smoothed.lng }}
      title={vehicle.name}
      onClick={() => onSelect(vehicle.id)}
      opacity={selected ? 1 : 0.75}
      icon={getVehicleIcon({ ...position, angle: smoothed.angle })}
    />
  );
}

export function MapView({
  vehicles,
  positions,
  selectedVehicleId,
  onSelectVehicle,
  historyPath,
}: MapViewProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { theme } = useTheme();

  const knownPositions = vehicles
    .map((v) => positions[v.id])
    .filter((p): p is Position => p !== undefined);

  const center = (selectedVehicleId && positions[selectedVehicleId]) ?? knownPositions[0] ?? null;

  if (!apiKey) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-[#0d1220] dark:text-slate-400">
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
          styles={theme === "dark" ? DARK_MAP_STYLE : undefined}
        >
          <MapCenterOnSelect selectedVehicleId={selectedVehicleId} positions={positions} />

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
              <AnimatedVehicleMarker
                key={vehicle.id}
                vehicle={vehicle}
                position={position}
                selected={vehicle.id === selectedVehicleId}
                onSelect={onSelectVehicle}
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
    <div className="absolute bottom-4 left-4 z-0 flex flex-col gap-1.5 rounded-2xl border border-white bg-white px-2.5 py-2 text-[11px] text-slate-600 shadow-lg shadow-slate-300/40 sm:px-3 sm:text-xs dark:border-white/10 dark:bg-[#111729] dark:text-slate-300 dark:shadow-black/40">
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
