import { useEffect, useRef, useState } from "react";
import { ColorScheme, InfoWindow, Map, Marker, Polyline, RenderingType, useMap } from "@vis.gl/react-google-maps";
import { Box, Map as MapIcon } from "lucide-react";
import { MapsProvider } from "../MapsProvider";
import { useTheme } from "../../context/ThemeContext";
import { INCIDENT_LABELS, type Incident } from "../../lib/drivingBehavior";
import { incidentPinUrl, PIN_HEIGHT, PIN_WIDTH } from "../../lib/incidentPins";
import {
  AHEAD_PX,
  metersPerPixel,
  MIN_HEADING_SPEED_KMH,
  norm,
  pointAhead,
  shortestTurn,
  TILT,
  zoomForSpeed,
} from "../../lib/driveCamera";
import { MAP_ID } from "../../lib/mapConfig";
import { buildRouteSegments } from "../../lib/speedTimeline";
import type { Position } from "../../lib/types";

interface HistoryMapViewProps {
  positions: Position[];
  currentPosition: Position | null;
  /** The last report playback has passed (the current position itself sits between reports). */
  currentIndex: number;
  speedLimit: number;
  /** Harsh events and speeding to mark as pins on the route. */
  incidents?: Incident[];
  /** Called when a pin is opened, so playback can jump to that moment. */
  onIncidentSelect?: (incident: Incident) => void;
}

function incidentIcon(type: Incident["type"]): google.maps.Icon | undefined {
  if (typeof google === "undefined" || !google.maps?.Size) return undefined;
  return {
    url: incidentPinUrl(type),
    scaledSize: new google.maps.Size(PIN_WIDTH, PIN_HEIGHT),
    anchor: new google.maps.Point(PIN_WIDTH / 2, PIN_HEIGHT),
  };
}

function currentPositionIcon(overLimit: boolean, drive: boolean): google.maps.Symbol | undefined {
  if (typeof google === "undefined" || !google.maps?.SymbolPath) return undefined;
  // In the 3D view the map turns with the vehicle, so an arrow that always points up reads as "forward".
  return {
    path: drive ? google.maps.SymbolPath.FORWARD_CLOSED_ARROW : google.maps.SymbolPath.CIRCLE,
    scale: drive ? 7 : 8,
    fillColor: overLimit ? "#dc2626" : "#7c3aed",
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2.5,
  };
}

type Mode = "overview" | "drive";
const MODE_KEY = "history-map-mode";
/** Share of the remaining distance the 3D camera covers each frame: it glides between playback steps. */
const EASE = 0.18;

function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "drive" ? "drive" : "overview";
  } catch {
    return "overview";
  }
}

interface CameraTarget {
  lat: number;
  lng: number;
  heading: number;
  zoom: number;
}

interface MapCameraProps {
  positions: Position[];
  currentPosition: Position | null;
  currentIndex: number;
  mode: Mode;
  follow: boolean;
  onUserMove: () => void;
  fitSignal: number;
}

/** The heading of a report: its own while moving, otherwise the one of the next stretch driven (a vehicle waiting to set
 * off still faces where it will go), otherwise null. */
function headingAt(positions: Position[], current: Position, index: number): number | null {
  if (current.speed >= MIN_HEADING_SPEED_KMH) return norm(current.angle);
  for (let i = index + 1; i < Math.min(positions.length, index + 60); i++) {
    if (positions[i]!.speed >= MIN_HEADING_SPEED_KMH) return norm(positions[i]!.angle);
  }
  return null;
}

/** The camera is driven from here instead of through the Map's `center` prop: a controlled center snaps the map back on
 * every playback tick and makes it impossible to look around. In "overview" the map follows the vehicle over the whole
 * route; in "drive" the camera sits behind it, tilted and turned to its heading. Either way, the moment the person drags or
 * zooms, following stops and the map stays wherever they put it. */
function MapCamera({ positions, currentPosition, currentIndex, mode, follow, onUserMove, fitSignal }: MapCameraProps) {
  const map = useMap();
  const lastHeading = useRef(0);
  const target = useRef<CameraTarget | null>(null);
  const shown = useRef<CameraTarget | null>(null);

  useEffect(() => {
    if (!map) return;
    const div = map.getDiv();
    const drag = map.addListener("dragstart", onUserMove);
    div.addEventListener("wheel", onUserMove, { passive: true });
    div.addEventListener("touchstart", onUserMove, { passive: true });
    return () => {
      drag.remove();
      div.removeEventListener("wheel", onUserMove);
      div.removeEventListener("touchstart", onUserMove);
    };
  }, [map, onUserMove]);

  // Overview: keep the vehicle in view without touching the zoom the person chose.
  useEffect(() => {
    if (!map || mode !== "overview" || !follow || !currentPosition) return;
    map.panTo({ lat: currentPosition.lat, lng: currentPosition.lng });
  }, [map, mode, follow, currentPosition]);

  // Back to the overview: level the camera and point north again.
  useEffect(() => {
    if (!map || mode !== "overview") return;
    map.moveCamera({ tilt: 0, heading: 0 });
  }, [map, mode]);

  // Drive: where the camera should be for the current report.
  useEffect(() => {
    if (!map || mode !== "drive" || !currentPosition) return;
    lastHeading.current = headingAt(positions, currentPosition, currentIndex) ?? lastHeading.current;
    const zoom = zoomForSpeed(currentPosition.speed);
    const center = pointAhead(
      currentPosition.lat,
      currentPosition.lng,
      lastHeading.current,
      AHEAD_PX * metersPerPixel(currentPosition.lat, zoom),
    );
    target.current = { lat: center.lat, lng: center.lng, heading: lastHeading.current, zoom };
  }, [map, mode, positions, currentPosition, currentIndex]);

  // A new route or a new mode starts the camera right at its place instead of flying there.
  useEffect(() => {
    shown.current = null;
  }, [mode, positions]);

  // Drive: ease the camera toward that place, frame by frame, so it glides between playback steps.
  useEffect(() => {
    if (!map || mode !== "drive" || !follow) return;
    let frame = 0;
    const tick = () => {
      const goal = target.current;
      if (goal) {
        const now = (shown.current ??= { ...goal });
        const dHeading = shortestTurn(now.heading, goal.heading);
        const settled =
          Math.abs(goal.lat - now.lat) < 1e-7 &&
          Math.abs(goal.lng - now.lng) < 1e-7 &&
          Math.abs(goal.zoom - now.zoom) < 1e-3 &&
          Math.abs(dHeading) < 0.05;
        if (!settled) {
          now.lat += (goal.lat - now.lat) * EASE;
          now.lng += (goal.lng - now.lng) * EASE;
          now.zoom += (goal.zoom - now.zoom) * EASE;
          now.heading = norm(now.heading + dHeading * EASE);
          map.moveCamera({ center: { lat: now.lat, lng: now.lng }, zoom: now.zoom, heading: now.heading, tilt: TILT });
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [map, mode, follow]);

  useEffect(() => {
    if (!map || fitSignal === 0 || positions.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const p of positions) bounds.extend({ lat: p.lat, lng: p.lng });
    map.moveCamera({ tilt: 0, heading: 0 });
    map.fitBounds(bounds, 40);
  }, [map, fitSignal, positions]);

  return null;
}

/** A deliberately spare map: the route as a couple of colored segments plus a single
 * marker for the current playback position — no swarm of per-point pins. */
export function HistoryMapView({
  positions,
  currentPosition,
  currentIndex,
  speedLimit,
  incidents = [],
  onIncidentSelect,
}: HistoryMapViewProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { theme } = useTheme();
  const [follow, setFollow] = useState(true);
  const [fitSignal, setFitSignal] = useState(0);
  const [mode, setMode] = useState<Mode>(readMode);
  const [openIncident, setOpenIncident] = useState<Incident | null>(null);

  // Another vehicle or period brings other events: a pin left open would point at nothing.
  useEffect(() => setOpenIncident(null), [incidents]);

  // A different vehicle or period starts over, following the vehicle.
  useEffect(() => setFollow(true), [positions]);

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        Falta configurar VITE_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  const segments = buildRouteSegments(positions, speedLimit);
  const center = currentPosition ?? positions[0]!;

  const stopFollowing = () => setFollow(false);
  function chooseMode(next: Mode) {
    setMode(next);
    setFollow(true);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // not remembered, that is all
    }
  }
  const buttonClass = (active = false) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow ring-1 ring-black/10 transition ${
      active
        ? "brand-button"
        : "bg-white/95 text-slate-700 hover:bg-white dark:bg-slate-800/95 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-slate-800"
    }`;

  return (
    <MapsProvider apiKey={apiKey}>
      <div className="relative h-full">
        <Map
          key={theme}
          className="h-full"
          defaultCenter={{ lat: center.lat, lng: center.lng }}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          fullscreenControl
          mapId={MAP_ID}
          renderingType={RenderingType.VECTOR}
          colorScheme={theme === "dark" ? ColorScheme.DARK : ColorScheme.LIGHT}
        >
          <MapCamera
            positions={positions}
            currentPosition={currentPosition}
            currentIndex={currentIndex}
            mode={mode}
            follow={follow}
            onUserMove={stopFollowing}
            fitSignal={fitSignal}
          />

          {segments.map((segment, i) => (
            <Polyline
              key={i}
              path={segment.path}
              strokeColor={segment.violation ? "#dc2626" : "#3b82f6"}
              strokeOpacity={0.85}
              strokeWeight={segment.violation ? 5 : 4}
            />
          ))}

          {incidents.map((incident, i) => (
            <Marker
              key={`${incident.type}-${incident.ts}-${i}`}
              position={{ lat: incident.lat, lng: incident.lng }}
              icon={incidentIcon(incident.type)}
              title={INCIDENT_LABELS[incident.type]}
              zIndex={10}
              onClick={() => {
                setOpenIncident(incident);
                onIncidentSelect?.(incident);
              }}
            />
          ))}

          {openIncident && (
            <InfoWindow
              position={{ lat: openIncident.lat, lng: openIncident.lng }}
              pixelOffset={[0, -PIN_HEIGHT]}
              onCloseClick={() => setOpenIncident(null)}
            >
              <div className="text-slate-900">
                <p className="text-sm font-semibold">{INCIDENT_LABELS[openIncident.type]}</p>
                <p className="text-xs">{openIncident.detail}</p>
                <p className="text-xs text-slate-500">
                  {new Date(openIncident.ts).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
            </InfoWindow>
          )}

          {currentPosition && (
            <Marker
              position={{ lat: currentPosition.lat, lng: currentPosition.lng }}
              icon={currentPositionIcon(currentPosition.speed > speedLimit, mode === "drive")}
            />
          )}
        </Map>
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <button type="button" className={buttonClass(mode === "overview")} onClick={() => chooseMode("overview")}>
            <MapIcon className="h-3.5 w-3.5" />
            Vista general
          </button>
          <button type="button" className={buttonClass(mode === "drive")} onClick={() => chooseMode("drive")}>
            <Box className="h-3.5 w-3.5" />
            Conducción 3D
          </button>
          {mode === "overview" && (
            <button
              type="button"
              className={buttonClass()}
              onClick={() => {
                setFollow(false);
                setFitSignal((n) => n + 1);
              }}
            >
              Ver recorrido completo
            </button>
          )}
          {!follow && (
            <button type="button" className={buttonClass()} onClick={() => setFollow(true)}>
              Seguir vehículo
            </button>
          )}
        </div>
      </div>
    </MapsProvider>
  );
}
