import { Map, Marker, Polygon, Polyline, useMap } from "@vis.gl/react-google-maps";
import { MapsProvider } from "./MapsProvider";
import { useEffect, useMemo } from "react";
import { useFleet } from "../context/FleetContext";
import { useTheme } from "../context/ThemeContext";
import { useT } from "../i18n";
import { useSmoothedPosition } from "../hooks/useSmoothedPosition";
import { geofenceZoneColor, isRomeZtl } from "../lib/geo";
import { DARK_MAP_STYLE } from "../lib/mapStyle";
import { fleetClass, fleetColors, fleetPrefixes, fleetTagCss, GAMONAL_FLEET } from "../lib/fleetBrand";
import { getVehicleIcon } from "../lib/markerIcon";
import { AVL_ID, type Geofence, type Position, type SharedVehicle, type Vehicle, type VehicleEta } from "../lib/types";

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

/** Pans to the Gamonal vehicle picked in the list (the way the client's own vehicles do on selection). */
function MapCenterOnShared({ vehicle }: { vehicle: SharedVehicle | null }) {
  const map = useMap();
  const plate = vehicle?.plate;
  useEffect(() => {
    if (!map || !vehicle) return;
    map.panTo({ lat: vehicle.lat, lng: vehicle.lng });
    if ((map.getZoom() ?? 0) < FOCUS_ZOOM) map.setZoom(FOCUS_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the choice changes, not on every position update
  }, [map, plate]);
  return null;
}

/** How much of the map the vehicle panel covers (the bottom sheet on a phone, the card on the right on a screen): the road is framed in the rest. */
function freeMapPadding(mapDiv: HTMLElement): google.maps.Padding {
  const edge = 48;
  const map = mapDiv.getBoundingClientRect();
  const panel = document.querySelector("[data-vehicle-panel]")?.getBoundingClientRect();
  // The "Vehículos" button sits at the top left and the full-screen one at the top right.
  const padding = { top: 76, right: edge, bottom: edge, left: edge };
  if (panel && panel.width > 0) {
    if (panel.width >= map.width * 0.8) padding.bottom = Math.min(map.bottom - panel.top + 16, map.height * 0.7);
    else padding.right = Math.min(map.right - panel.left + 16, map.width * 0.6);
  }
  return padding;
}

/** The road still ahead of the vehicle to the destination it was asked about, with a pin on it, and the camera framing all of it. */
function RouteLayer({ route }: { route: VehicleEta }) {
  const map = useMap();
  const path = useMemo(() => route.path.map(([lat, lng]) => ({ lat, lng })), [route]);

  useEffect(() => {
    if (!map) return;
    // After the panel has laid out its answer, so what it covers is known.
    const timer = window.setTimeout(() => {
      const bounds = new google.maps.LatLngBounds();
      for (const point of path) bounds.extend(point);
      bounds.extend(route.from);
      bounds.extend(route.destination);
      map.fitBounds(bounds, freeMapPadding(map.getDiv()));
    }, 120);
    return () => window.clearTimeout(timer);
  }, [map, route, path]);

  return (
    <>
      {path.length > 1 && <Polyline path={path} strokeColor="#2563eb" strokeOpacity={0.9} strokeWeight={6} clickable={false} />}
      <Marker position={route.destination} title={route.destination.label} />
    </>
  );
}

interface MapViewProps {
  vehicles: Vehicle[];
  positions: Record<string, Position>;
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
  /** Gamonal vehicles shown to a client by Gamonal Driver (already narrowed by the pills): same colours, fainter, no detail. */
  sharedVehicles?: SharedVehicle[];
  selectedSharedPlate?: string | null;
  onSelectShared?: (plate: string) => void;
  /** False when the pills ask for the Gamonal vehicles only. */
  showOwn?: boolean;
  /** The road ahead of the selected vehicle to a searched destination: drawn and framed whole. */
  route?: VehicleEta | null;
}

const DEFAULT_CENTER = { lat: 41.9028, lng: 12.4964 }; // Roma, como fallback sin posiciones aún

interface AnimatedVehicleMarkerProps {
  vehicle: Vehicle;
  position: Position;
  selected: boolean;
  onSelect: (vehicleId: string) => void;
  theme: "light" | "dark";
}

/** A Gamonal vehicle seen through Gamonal Driver: the same colours as the client's own, fainter, with its plate. */
function SharedVehicleMarker({
  vehicle,
  theme,
  title,
  selected,
  onSelect,
}: {
  vehicle: SharedVehicle;
  theme: "light" | "dark";
  title: string;
  selected: boolean;
  onSelect?: (plate: string) => void;
}) {
  const position = {
    ioData: { [AVL_ID.IGNITION]: vehicle.ignition ? 1 : 0 },
    speed: vehicle.speed ?? 0,
    angle: vehicle.direction ?? 0,
  } as unknown as Position;
  return (
    <Marker
      position={{ lat: vehicle.lat, lng: vehicle.lng }}
      title={title}
      onClick={() => onSelect?.(vehicle.plate)}
      icon={getVehicleIcon(position, selected ? 1 : 0.6)}
      label={{ text: vehicle.plate, className: `vehicle-plate-label ${fleetClass(GAMONAL_FLEET)}`, color: theme === "dark" ? "#e2e8f0" : "#0f172a" }}
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
      icon={getVehicleIcon({ ...position, angle: smoothed.angle }, selected ? 1 : 0.75)}
      label={{
        text: vehicle.plate ?? vehicle.name,
        // The fleet's coloured tag ("DH", "UN"…) is drawn in CSS from this class — see fleetBrand.ts.
        className: vehicle.fleetGroup ? `vehicle-plate-label ${fleetClass(vehicle.fleetGroup)}` : "vehicle-plate-label",
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
  sharedVehicles: shared = [],
  selectedSharedPlate = null,
  onSelectShared,
  showOwn = true,
  route = null,
}: MapViewProps) {
  const t = useT();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { theme } = useTheme();
  const { geofences } = useFleet();
  const zonePolygons = geofences.filter((g) => g.type === "polygon" && g.path && !isRomeZtl(g.name));

  const knownPositions = vehicles
    .map((v) => positions[v.id])
    .filter((p): p is Position => p !== undefined);

  const center = (selectedVehicleId && positions[selectedVehicleId]) ?? knownPositions[0] ?? shared[0] ?? null;

  // The fleets on the map, each with its tag on the plate (and a line in the legend).
  const fleets = [...new Set([...(showOwn ? vehicles.map((v) => v.fleetGroup) : []), ...(shared.length > 0 ? [GAMONAL_FLEET] : [])].filter((f): f is string => !!f))];

  if (!apiKey) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-[#0d1220] dark:text-slate-400">
        {t("map.missingKey")}
      </div>
    );
  }

  return (
    <div className="relative h-full flex-1">
      <style>{fleetTagCss(fleets)}</style>
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
          <MapCenterOnShared vehicle={shared.find((v) => v.plate === selectedSharedPlate) ?? null} />
          {route && <RouteLayer route={route} />}

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

          {(showOwn ? vehicles : []).map((vehicle) => {
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
            <SharedVehicleMarker
              key={vehicle.plate}
              vehicle={vehicle}
              theme={theme}
              title={t("map.sharedTitle", { plate: vehicle.plate })}
              selected={vehicle.plate === selectedSharedPlate}
              onSelect={onSelectShared}
            />
          ))}
        </Map>

        {/* Just above Google's own logo, which has to stay visible. */}
        <div className="absolute bottom-6 left-2 z-0">
          <MapLegend zonePolygons={zonePolygons} showShared={shared.length > 0} fleets={fleets} />
        </div>
      </MapsProvider>
    </div>
  );
}

function MapLegend({ zonePolygons, showShared, fleets }: { zonePolygons: Geofence[]; showShared: boolean; fleets: string[] }) {
  const t = useT();
  const zoneNames = [...new Set(zonePolygons.map((g) => g.name))];
  const prefixes = fleetPrefixes(fleets);

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
      {prefixes.size > 1 && (
        <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-1.5 dark:border-white/10">
          {[...prefixes].map(([fleet, prefix]) => {
            const { bg, fg } = fleetColors(fleet);
            return (
              <div key={fleet} className="flex items-center gap-2">
                <span className="rounded px-1 text-[10px] font-semibold leading-4" style={{ backgroundColor: bg, color: fg }}>
                  {prefix}
                </span>
                {fleet}
              </div>
            );
          })}
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
