import { useEffect, useRef, useState } from "react";
import { InfoWindow, Map, Marker, Polyline, useMap } from "@vis.gl/react-google-maps";
import { MapsProvider } from "../MapsProvider";
import { useTheme } from "../../context/ThemeContext";
import { INCIDENT_LABELS, type Incident } from "../../lib/drivingBehavior";
import { incidentPinUrl, PIN_HEIGHT, PIN_WIDTH } from "../../lib/incidentPins";
import { DARK_MAP_STYLE, MUTED_MAP_STYLE } from "../../lib/mapStyle";
import { buildRouteSegments } from "../../lib/speedTimeline";
import type { Position } from "../../lib/types";

interface HistoryMapViewProps {
  positions: Position[];
  currentPosition: Position | null;
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

interface MapCameraProps {
  positions: Position[];
  currentPosition: Position | null;
  follow: boolean;
  onUserMove: () => void;
  fitSignal: number;
}

/** The camera is driven from here instead of through the Map's `center` prop: a controlled center snaps the map back on
 * every playback tick and makes it impossible to look around. While `follow` is on the map tracks the vehicle; the moment
 * the person drags or zooms, follow turns off and the map stays wherever they put it. */
function MapCamera({ positions, currentPosition, follow, onUserMove, fitSignal }: MapCameraProps) {
  const map = useMap();
  const moving = useRef(false);

  useEffect(() => {
    if (!map) return;
    const start = map.addListener("dragstart", onUserMove);
    const wheel = map.addListener("zoom_changed", () => {
      if (!moving.current) onUserMove();
    });
    return () => {
      start.remove();
      wheel.remove();
    };
  }, [map, onUserMove]);

  useEffect(() => {
    if (!map || !follow || !currentPosition) return;
    moving.current = true;
    map.panTo({ lat: currentPosition.lat, lng: currentPosition.lng });
    const t = setTimeout(() => (moving.current = false), 50);
    return () => clearTimeout(t);
  }, [map, follow, currentPosition]);

  useEffect(() => {
    if (!map || fitSignal === 0 || positions.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const p of positions) bounds.extend({ lat: p.lat, lng: p.lng });
    moving.current = true;
    map.fitBounds(bounds, 40);
    const t = setTimeout(() => (moving.current = false), 300);
    return () => clearTimeout(t);
  }, [map, fitSignal, positions]);

  return null;
}

/** A deliberately spare map: the route as a couple of colored segments plus a single
 * marker for the current playback position — no swarm of per-point pins. */
export function HistoryMapView({
  positions,
  currentPosition,
  speedLimit,
  incidents = [],
  onIncidentSelect,
}: HistoryMapViewProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { theme } = useTheme();
  const [follow, setFollow] = useState(true);
  const [fitSignal, setFitSignal] = useState(0);
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
  const buttonClass =
    "rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow ring-1 ring-black/10 hover:bg-white dark:bg-slate-800/95 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-slate-800";

  return (
    <MapsProvider apiKey={apiKey}>
      <div className="relative h-full">
        <Map
          className="h-full"
          defaultCenter={{ lat: center.lat, lng: center.lng }}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          fullscreenControl
          styles={theme === "dark" ? DARK_MAP_STYLE : MUTED_MAP_STYLE}
        >
          <MapCamera
            positions={positions}
            currentPosition={currentPosition}
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
              icon={currentPositionIcon(currentPosition.speed > speedLimit)}
            />
          )}
        </Map>
        <div className="absolute left-3 top-3 flex gap-2">
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              setFollow(false);
              setFitSignal((n) => n + 1);
            }}
          >
            Ver recorrido completo
          </button>
          <button type="button" className={buttonClass} onClick={() => setFollow(true)} disabled={follow}>
            {follow ? "Siguiendo vehículo" : "Seguir vehículo"}
          </button>
        </div>
      </div>
    </MapsProvider>
  );
}
