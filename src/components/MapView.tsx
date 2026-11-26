import { ColorScheme, Map, Marker, Polygon, Polyline, RenderingType, useMap, type MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import { MapResizeOnChange } from "./MapFullscreenControl";
import { MapHud, MapVignette, unrotated, useMapOrientation } from "./map/MapHud";
import { MapsProvider } from "./MapsProvider";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFleet } from "../context/FleetContext";
import { useTheme } from "../context/ThemeContext";
import { useT } from "../i18n";
import { useSmoothedPosition } from "../hooks/useSmoothedPosition";
import { geofenceZoneColor, isRomeZtl } from "../lib/geo";
import { fitBoundsKeepingView, MAP_ID, prefersThreeD, PRO_TILT } from "../lib/mapConfig";
import { fleetClass, fleetTagCss, GAMONAL_FLEET } from "../lib/fleetBrand";
import { getBrokenIcon, getVehicleIcon } from "../lib/markerIcon";
import { AVL_ID, type Position, type SharedVehicle, type Vehicle, type VehicleEta } from "../lib/types";

const FOCUS_ZOOM = 15;

/** What the map shows now (kept across a theme change, which has to build the map again). */
interface Camera {
  center: { lat: number; lng: number };
  zoom: number;
  heading: number;
  tilt: number;
}

const CAMERA_KEY = "onesystem.map.camera.v1";

/** Where the person left the map last time on this device (storage can be unavailable: then it just starts fresh). */
function loadSavedCamera(): Camera | null {
  try {
    const raw = localStorage.getItem(CAMERA_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Camera>;
    const ok =
      typeof value.center?.lat === "number" && typeof value.center?.lng === "number" && typeof value.zoom === "number" && value.zoom >= 2 && value.zoom <= 22;
    return ok ? { center: value.center!, zoom: value.zoom!, heading: value.heading ?? 0, tilt: value.tilt ?? 0 } : null;
  } catch {
    return null;
  }
}

function saveCamera(camera: Camera): void {
  try {
    localStorage.setItem(CAMERA_KEY, JSON.stringify(camera));
  } catch {
    /* nothing to remember it with: the map still works */
  }
}

/** Frames every vehicle at once: when "Ver toda la flota" is pressed (`signal` changes) and, the very first time the map has no
 * remembered view, by itself. */
function FitFleet({ points, signal, auto }: { points: Array<{ lat: number; lng: number }>; signal: number; auto: boolean }) {
  const map = useMap();
  const autoDone = useRef(false);
  const lastSignal = useRef(signal);

  const fit = useCallback(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.panTo(points[0]!);
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const point of points) bounds.extend(point);
    fitBoundsKeepingView(map, bounds, 72);
  }, [map, points]);

  useEffect(() => {
    if (signal !== lastSignal.current) {
      lastSignal.current = signal;
      fit();
      return;
    }
    if (!auto || autoDone.current || !map || points.length === 0) return;
    autoDone.current = true;
    fit();
  }, [signal, auto, map, points, fit]);

  return null;
}

const useMapHeading = () => useMapOrientation().heading;

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
      fitBoundsKeepingView(map, bounds, freeMapPadding(map.getDiv()));
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
  /** Changes each time "Ver toda la flota" is pressed: the map frames every vehicle. */
  fitSignal?: number;
  /** The page's own full screen (see useInAppFullscreen): whether the map covers the screen, and the button that toggles it. */
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
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
  const heading = useMapHeading();
  const position = {
    ioData: { [AVL_ID.IGNITION]: vehicle.ignition ? 1 : 0 },
    speed: vehicle.speed ?? 0,
    angle: unrotated(vehicle.direction ?? 0, heading),
  } as unknown as Position;
  return (
    <Marker
      position={{ lat: vehicle.lat, lng: vehicle.lng }}
      title={title}
      onClick={() => onSelect?.(vehicle.plate)}
      icon={getVehicleIcon(position, selected ? 1 : 0.6, selected)}
      optimized={false}
      label={{ text: vehicle.plate, className: `vehicle-plate-label ${fleetClass(GAMONAL_FLEET)}`, color: theme === "dark" ? "#e2e8f0" : "#0f172a" }}
    />
  );
}

/** Glides between real reports instead of snapping — see useSmoothedPosition. Split out
 * so each vehicle's animation is its own hook instance, independent of the others. */
function AnimatedVehicleMarker({ vehicle, position, selected, onSelect, theme }: AnimatedVehicleMarkerProps) {
  const t = useT();
  const smoothed = useSmoothedPosition(position);
  const heading = useMapHeading();
  if (!smoothed) return null;

  return (
    <>
    {vehicle.outOfService && (
      <Marker
        position={{ lat: smoothed.lat, lng: smoothed.lng }}
        title={t("map.broken", { plate: vehicle.plate ?? vehicle.name })}
        icon={getBrokenIcon()}
        clickable={false}
        zIndex={1000}
      />
    )}
    <Marker
      position={{ lat: smoothed.lat, lng: smoothed.lng }}
      title={vehicle.name}
      onClick={() => onSelect(vehicle.id)}
      icon={getVehicleIcon({ ...position, angle: unrotated(smoothed.angle, heading) }, selected ? 1 : 0.85, selected)}
      // Drawn as a page element (not baked into the map's canvas) so the moving vehicle's ground ring animates.
      optimized={false}
      zIndex={selected ? 900 : undefined}
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
    </>
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
  fitSignal = 0,
  fullscreen = false,
  onToggleFullscreen,
}: MapViewProps) {
  const t = useT();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { theme } = useTheme();
  const { geofences, fleetLogos } = useFleet();
  const camera = useRef<Camera | null>(null);
  // Where it was left last time on this device; read once. Without it, the first positions frame the whole fleet.
  const saved = useRef<Camera | null | undefined>(undefined);
  if (saved.current === undefined) saved.current = loadSavedCamera();
  // Decided once, at the start: the map reports its first view at once, which must not count as "already had one".
  const frameFleetOnLoad = useRef<boolean | undefined>(undefined);
  if (frameFleetOnLoad.current === undefined) frameFleetOnLoad.current = !saved.current && !camera.current;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const zonePolygons = geofences.filter((g) => g.type === "polygon" && g.path && !isRomeZtl(g.name));

  const knownPositions = vehicles
    .map((v) => positions[v.id])
    .filter((p): p is Position => p !== undefined);

  // What "see my whole fleet" frames: every vehicle drawn with a GPS fix (a tracker without one reports 0/0, a point in the sea).
  const fitPoints = useMemo(
    () =>
      [...(showOwn ? knownPositions : []), ...shared]
        .filter((p) => p.lat !== 0 || p.lng !== 0)
        .map((p) => ({ lat: p.lat, lng: p.lng })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed when the set of positions changes
    [showOwn, shared, positions, vehicles],
  );

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
      <style>{fleetTagCss(fleets, fleetLogos)}</style>
      <MapsProvider apiKey={apiKey}>
        <Map
          // The vector map turns and tilts with two fingers; its colours come from the scheme, which is set when the
          // map is built, so a theme change builds it again — from where the person had left it.
          key={theme}
          className="h-full"
          defaultCenter={camera.current?.center ?? saved.current?.center ?? (center ? { lat: center.lat, lng: center.lng } : DEFAULT_CENTER)}
          defaultZoom={camera.current?.zoom ?? saved.current?.zoom ?? (center ? 14 : 4)}
          defaultHeading={camera.current?.heading ?? saved.current?.heading ?? 0}
          defaultTilt={camera.current?.tilt ?? saved.current?.tilt ?? (prefersThreeD() ? PRO_TILT : 0)}
          onCameraChanged={(e: MapCameraChangedEvent) => {
            const { center: c, zoom, heading, tilt } = e.detail;
            camera.current = { center: c, zoom, heading, tilt };
            // Remembered once the view settles, not on every frame of a pan.
            clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => camera.current && saveCamera(camera.current), 600);
          }}
          gestureHandling="greedy"
          // None of Google's buttons: the map's own glass column (MapHud) does 3D, turning, north, zoom and full screen.
          disableDefaultUI
          mapId={MAP_ID}
          renderingType={RenderingType.VECTOR}
          headingInteractionEnabled
          tiltInteractionEnabled
          colorScheme={theme === "dark" ? ColorScheme.DARK : ColorScheme.LIGHT}
        >
          <MapResizeOnChange trigger={fullscreen} />
          <FitFleet points={fitPoints} signal={fitSignal} auto={frameFleetOnLoad.current === true} />
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
        <MapVignette />
        {/* Left, midway: the top left is the vehicle search, the top right the filters, the right side the vehicle's panel. */}
        <MapHud className="top-1/2 left-2.5 -translate-y-1/2" fullscreen={fullscreen} onToggleFullscreen={onToggleFullscreen} />
      </MapsProvider>
    </div>
  );
}
