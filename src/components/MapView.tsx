import { Map, Marker, Polygon, Polyline, useMap } from "@vis.gl/react-google-maps";
import { MapsProvider } from "./MapsProvider";
import { useEffect } from "react";
import { useFleet } from "../context/FleetContext";
import { useTheme } from "../context/ThemeContext";
import { useT } from "../i18n";
import { useSmoothedPosition } from "../hooks/useSmoothedPosition";
import { geofenceZoneColor } from "../lib/geo";
import { DARK_MAP_STYLE } from "../lib/mapStyle";
import { getVehicleIcon } from "../lib/markerIcon";
import { AVL_ID, type Geofence, type Position, type SharedVehicle, type Vehicle } from "../lib/types";

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
  /** Gamonal vehicles shown to a client by Gamonal Driver: same colours, fainter, no detail. */
  sharedVehicles?: SharedVehicle[];
}

const DEFAULT_CENTER = { lat: 41.9028, lng: 12.4964 }; // Roma, como fallback sin posiciones aún

interface AnimatedVehicleMarkerProps {
  vehicle: Vehicle;
  position: Position;
  selected: boolean;
  onSelect: (vehicleId: string) => void;
  theme: "light" | "dark";
}

const normalizePlate = (plate: string | null | undefined) => (plate ?? "").replace(/\s+/g, "").toUpperCase();

/** A Gamonal vehicle seen through Gamonal Driver: the same colours as the client's own, fainter, with its plate. */
function SharedVehicleMarker({ vehicle, theme, title }: { vehicle: SharedVehicle; theme: "light" | "dark"; title: string }) {
  const position = {
    ioData: { [AVL_ID.IGNITION]: vehicle.ignition ? 1 : 0 },
    speed: vehicle.speed ?? 0,
    angle: vehicle.direction ?? 0,
  } as unknown as Position;
  return (
    <Marker
      position={{ lat: vehicle.lat, lng: vehicle.lng }}
      title={title}
      opacity={0.6}
      icon={getVehicleIcon(position)}
      label={{ text: vehicle.plate, className: "vehicle-plate-label", color: theme === "dark" ? "#e2e8f0" : "#0f172a" }}
    />
  );
}

/** Glides between real reports instead of snapping — see useSmoothedPosition. Split out
 * so each vehicle's animation is its own hook instance, independent of the others. */
function AnimatedVehicleMarker({ vehicle, position, selected, onSelect, theme }: AnimatedVehicleMarkerProps) {
  const smoothed = useSmoothedPosition(position);
  if (!smoothed) return null;

  return (
    <Marker
      position={{ lat: smoothed.lat, lng: smoothed.lng }}
      title={vehicle.name}
      onClick={() => onSelect(vehicle.id)}
      opacity={selected ? 1 : 0.75}
      icon={getVehicleIcon({ ...position, angle: smoothed.angle })}
      label={{
        text: vehicle.plate ?? vehicle.name,
        className: "vehicle-plate-label",
        // Google always renders a label color inline (defaulting to black), which beats
        // any CSS class on specificity — has to be set here per-theme, not in index.css,
        // or the plate text goes invisible against the dark chip in dark mode.
        color: theme === "dark" ? "#e2e8f0" : "#0f172a",
      }}
    />
  );
}

export function MapView({
  vehicles,
  positions,
  selectedVehicleId,
  onSelectVehicle,
  historyPath,
  sharedVehicles = [],
}: MapViewProps) {
  const t = useT();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { theme } = useTheme();
  const { geofences } = useFleet();
  const zonePolygons = geofences.filter((g) => g.type === "polygon" && g.path);

  const knownPositions = vehicles
    .map((v) => positions[v.id])
    .filter((p): p is Position => p !== undefined);

  // A vehicle the client also has of their own is drawn once, as theirs.
  const ownPlates = new Set(vehicles.map((v) => normalizePlate(v.plate)));
  const shared = sharedVehicles.filter((v) => !ownPlates.has(v.plate));

  const center = (selectedVehicleId && positions[selectedVehicleId]) ?? knownPositions[0] ?? shared[0] ?? null;

  if (!apiKey) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-[#0d1220] dark:text-slate-400">
        {t("map.missingKey")}
      </div>
    );
  }

  return (
    <div className="relative h-full flex-1">
      <MapsProvider apiKey={apiKey}>
        <Map
          className="h-full"
          defaultCenter={center ? { lat: center.lat, lng: center.lng } : DEFAULT_CENTER}
          defaultZoom={center ? 14 : 4}
          gestureHandling="greedy"
          disableDefaultUI={false}
          // Map/satellite and the street-view figure are left out: the map is the point, so the centre stays clear.
          mapTypeControl={false}
          streetViewControl={false}
          styles={theme === "dark" ? DARK_MAP_STYLE : undefined}
        >
          <MapCenterOnSelect selectedVehicleId={selectedVehicleId} positions={positions} />

          {zonePolygons.map((g) => {
            const color = geofenceZoneColor(g.name);
            return (
              <Polygon
                key={g.id}
                paths={g.path!}
                strokeColor={color.stroke}
                strokeOpacity={0.7}
                strokeWeight={2}
                fillColor={color.fill}
                fillOpacity={0.12}
                clickable={false}
              />
            );
          })}

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
                theme={theme}
              />
            );
          })}

          {shared.map((vehicle) => (
            <SharedVehicleMarker key={vehicle.plate} vehicle={vehicle} theme={theme} title={t("map.sharedTitle", { plate: vehicle.plate })} />
          ))}
        </Map>

        {/* Just above Google's own logo, which has to stay visible. */}
        <div className="absolute bottom-6 left-2 z-0">
          <MapLegend zonePolygons={zonePolygons} showShared={shared.length > 0} />
        </div>
      </MapsProvider>
    </div>
  );
}

function MapLegend({ zonePolygons, showShared }: { zonePolygons: Geofence[]; showShared: boolean }) {
  const t = useT();
  const zoneNames = [...new Set(zonePolygons.map((g) => g.name))];

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white bg-white px-2.5 py-2 text-[11px] text-slate-600 shadow-lg shadow-slate-300/40 sm:px-3 sm:text-xs dark:border-white/10 dark:bg-[#111729] dark:text-slate-300 dark:shadow-black/40">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
        {t("map.legendOff")}
      </div>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
        {t("map.legendIdle")}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-green-600">▲</span>
        {t("map.legendMoving")}
      </div>
      {showShared && (
        <div className="flex items-center gap-2 border-t border-slate-100 pt-1.5 dark:border-white/10">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-slate-400 bg-transparent" />
          {t("map.legendShared")}
        </div>
      )}
      {zoneNames.length > 0 && (
        <div className="mt-1 flex flex-col gap-1.5 border-t border-slate-100 pt-1.5 dark:border-white/10">
          {zoneNames.map((name) => (
            <div key={name} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: geofenceZoneColor(name).fill }}
              />
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
