import {
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  ColorScheme,
  Map as GoogleMap,
  Polyline,
  RenderingType,
  useMap,
} from "@vis.gl/react-google-maps";
import { Box, LocateFixed, Map as MapIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MapsProvider } from "../MapsProvider";
import { useTheme } from "../../context/ThemeContext";
import type { SmoothedPosition } from "../../hooks/useSmoothedPosition";
import {
  AHEAD_PX,
  metersPerPixel,
  MIN_HEADING_SPEED_KMH,
  norm,
  pointAhead,
  TILT,
  zoomForSpeed,
} from "../../lib/driveCamera";
import { MAP_ID } from "../../lib/mapConfig";
import type { Position } from "../../lib/types";

/**
 * The Cockpit map seen from behind the vehicle, like a navigation view: the camera is tilted, turned to where the vehicle
 * is heading and kept just behind it, so the road ahead fills the screen. A vector map is needed for the tilt and rotation
 * (a raster one ignores them and stays flat, north up). "DEMO_MAP_ID" is Google's id for development; set
 * VITE_GOOGLE_MAPS_MAP_ID to a vector Map ID of your own for production.
 */

const MODE_KEY = "cockpit-map-mode";
const TRAIL_POINTS = 150;

type Mode = "drive" | "map";

function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "map" ? "map" : "drive";
  } catch {
    return "drive";
  }
}

interface CameraRigProps {
  smoothed: SmoothedPosition;
  mode: Mode;
  follow: boolean;
  headingRef: React.MutableRefObject<number>;
  onUserMove: () => void;
}

/** Drives the camera from the (already eased) position; lives inside the Map to reach it. */
function CameraRig({ smoothed, mode, follow, headingRef, onUserMove }: CameraRigProps) {
  const map = useMap();

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

  useEffect(() => {
    if (!map || !follow) return;
    if (smoothed.speed >= MIN_HEADING_SPEED_KMH) headingRef.current = norm(smoothed.angle);
    if (mode === "drive") {
      const zoom = zoomForSpeed(smoothed.speed);
      map.moveCamera({
        center: pointAhead(
          smoothed.lat,
          smoothed.lng,
          headingRef.current,
          AHEAD_PX * metersPerPixel(smoothed.lat, zoom),
        ),
        zoom,
        heading: headingRef.current,
        tilt: TILT,
      });
    } else {
      map.moveCamera({ center: { lat: smoothed.lat, lng: smoothed.lng }, zoom: 15, heading: 0, tilt: 0 });
    }
  }, [map, smoothed, mode, follow, headingRef]);

  return null;
}

function VehicleArrow({ rotation }: { rotation: number }) {
  return (
    <div style={{ transform: `rotate(${rotation}deg)`, filter: "drop-shadow(0 4px 6px rgba(0,0,0,.55))" }}>
      <svg width="46" height="46" viewBox="0 0 44 44" aria-hidden="true">
        <path d="M22 3 L38 38 L22 30 L6 38 Z" fill="#3b82f6" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

interface DriveMapProps {
  /** Another vehicle starts a fresh trail and heading; the map itself is kept (a new map would be a new, billed load). */
  vehicleId: string;
  /** The raw report (its time tells when a new point arrived). */
  position: Position | null;
  /** The same position eased between reports, so the camera glides instead of jumping. */
  smoothed: SmoothedPosition | null;
}

export function DriveMap({ vehicleId, position, smoothed }: DriveMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { theme } = useTheme();
  const [mode, setMode] = useState<Mode>(readMode);
  const [follow, setFollow] = useState(true);
  const [trail, setTrail] = useState<google.maps.LatLngLiteral[]>([]);
  const headingRef = useRef(0);

  useEffect(() => {
    setTrail([]);
    setFollow(true);
    headingRef.current = 0;
  }, [vehicleId]);

  // The path just driven, from the reports as they arrive (nothing is fetched for it).
  useEffect(() => {
    if (!position) return;
    setTrail((points) => {
      const last = points[points.length - 1];
      if (last && last.lat === position.lat && last.lng === position.lng) return points;
      return [...points, { lat: position.lat, lng: position.lng }].slice(-TRAIL_POINTS);
    });
  }, [position?.ts, position?.lat, position?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  function chooseMode(next: Mode) {
    setMode(next);
    setFollow(true);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // not remembered, that is all
    }
  }

  if (!apiKey || !position || !smoothed) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        {position ? "Falta configurar el mapa." : "Sin ubicación todavía."}
      </div>
    );
  }

  const buttonClass = (active: boolean) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow ring-1 ring-black/10 transition ${
      active
        ? "brand-button"
        : "bg-white/95 text-slate-700 hover:bg-white dark:bg-slate-800/95 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-slate-800"
    }`;

  return (
    <div className="relative h-full w-full">
      <MapsProvider apiKey={apiKey}>
        <GoogleMap
          key={theme}
          className="h-full w-full"
          mapId={MAP_ID}
          renderingType={RenderingType.VECTOR}
          colorScheme={theme === "dark" ? ColorScheme.DARK : ColorScheme.LIGHT}
          defaultCenter={{ lat: smoothed.lat, lng: smoothed.lng }}
          defaultZoom={17}
          gestureHandling="greedy"
          disableDefaultUI
        >
          <CameraRig
            smoothed={smoothed}
            mode={mode}
            follow={follow}
            headingRef={headingRef}
            onUserMove={() => setFollow(false)}
          />
          {trail.length > 1 && (
            <Polyline path={trail} strokeColor="#3b82f6" strokeOpacity={0.85} strokeWeight={mode === "drive" ? 7 : 4} />
          )}
          <AdvancedMarker
            position={{ lat: smoothed.lat, lng: smoothed.lng }}
            anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
          >
            <VehicleArrow rotation={mode === "drive" ? 0 : headingRef.current} />
          </AdvancedMarker>
        </GoogleMap>
      </MapsProvider>

      <div className="absolute top-3 left-3 flex flex-wrap gap-2">
        <button type="button" className={buttonClass(mode === "drive")} onClick={() => chooseMode("drive")}>
          <Box className="h-3.5 w-3.5" />
          Conducción 3D
        </button>
        <button type="button" className={buttonClass(mode === "map")} onClick={() => chooseMode("map")}>
          <MapIcon className="h-3.5 w-3.5" />
          Mapa
        </button>
        {!follow && (
          <button type="button" className={buttonClass(false)} onClick={() => setFollow(true)}>
            <LocateFixed className="h-3.5 w-3.5" />
            Seguir vehículo
          </button>
        )}
      </div>
    </div>
  );
}
