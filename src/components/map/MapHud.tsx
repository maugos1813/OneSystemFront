import { useMap } from "@vis.gl/react-google-maps";
import { Compass, Maximize, Minimize, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "../../i18n";
import { animateCamera, PRO_TILT, rememberThreeD } from "../../lib/mapConfig";

/** How far the person has turned and tilted the map. A turn made with the fingers doesn't always fire the heading
 * event on a vector map, but it always moves the view, so the view's own events are listened to as well. A vehicle's
 * arrow is drawn against the screen, not the map, so it has to turn the other way by the heading to keep pointing where
 * the vehicle is really going. Works anywhere inside the maps provider, on the page's only map. */
export function useMapOrientation(): { heading: number; tilt: number } {
  const map = useMap();
  const [view, setView] = useState({ heading: 0, tilt: 0 });
  useEffect(() => {
    if (!map) return;
    const read = () => {
      const heading = map.getHeading() ?? 0;
      const tilt = map.getTilt() ?? 0;
      setView((current) => (current.heading === heading && current.tilt === tilt ? current : { heading, tilt }));
    };
    read();
    const listeners = ["heading_changed", "tilt_changed", "bounds_changed", "idle"].map((event) => map.addListener(event, read));
    return () => listeners.forEach((l) => l.remove());
  }, [map]);
  return view;
}

/** A vehicle's heading as drawn on the screen of a map turned by `mapHeading`. */
export const unrotated = (angle: number, mapHeading: number) => (((angle - mapHeading) % 360) + 360) % 360;

const BUTTON =
  "glass-bubble flex h-10 w-10 touch-manipulation items-center justify-center rounded-full text-slate-700 transition hover:text-slate-950 active:scale-95 dark:text-slate-200 dark:hover:text-white";

/**
 * The map's glass control column (the "PRO" view): 3D / 2D, turn the map, the compass (points north; a tap puts north back up),
 * zoom, and the page's full screen. It sits over the map as ordinary buttons of the page, not inside Google's control layer: there,
 * on an Android phone, the map's touch handling swallowed the taps. `className` places it.
 */
export function MapHud({
  className,
  fullscreen,
  onToggleFullscreen,
}: {
  className: string;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const t = useT();
  const map = useMap();
  const { heading, tilt } = useMapOrientation();
  const threeD = tilt > 5;
  if (!map) return null;

  const turn = (by: number) => animateCamera(map, { heading: heading + by });
  const zoom = (by: number) => animateCamera(map, { zoom: Math.round((map.getZoom() ?? 10) + by) }, 350);
  const toggle3d = () => {
    rememberThreeD(!threeD);
    animateCamera(map, threeD ? { tilt: 0, heading: 0 } : { tilt: PRO_TILT });
  };
  const fullLabel = fullscreen ? t("map.exitFullscreen") : t("map.fullscreen");

  return (
    <div className={`absolute z-10 flex flex-col items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={toggle3d}
        title={threeD ? t("map.view2d") : t("map.view3d")}
        aria-label={threeD ? t("map.view2d") : t("map.view3d")}
        aria-pressed={threeD}
        className={`${BUTTON} text-[13px] font-bold tracking-tight ${threeD ? "text-blue-600! ring-2 ring-blue-400/50 dark:text-sky-300! dark:ring-sky-400/40" : ""}`}
      >
        {threeD ? "3D" : "2D"}
      </button>
      <button type="button" onClick={() => turn(-45)} title={t("map.rotateLeft")} aria-label={t("map.rotateLeft")} className={`${BUTTON} hidden sm:flex`}>
        <RotateCcw className="h-[18px] w-[18px]" />
      </button>
      <button type="button" onClick={() => turn(45)} title={t("map.rotateRight")} aria-label={t("map.rotateRight")} className={`${BUTTON} hidden sm:flex`}>
        <RotateCw className="h-[18px] w-[18px]" />
      </button>
      <button type="button" onClick={() => animateCamera(map, { heading: 0 })} title={t("map.resetNorth")} aria-label={t("map.resetNorth")} className={BUTTON}>
        <Compass className="h-5 w-5 transition-transform" style={{ transform: `rotate(${-heading}deg)` }} />
      </button>
      <span className="my-0.5 h-px w-6 bg-slate-400/40 dark:bg-white/15" />
      <button type="button" onClick={() => zoom(1)} title={t("map.zoomIn")} aria-label={t("map.zoomIn")} className={BUTTON}>
        <Plus className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => zoom(-1)} title={t("map.zoomOut")} aria-label={t("map.zoomOut")} className={BUTTON}>
        <Minus className="h-5 w-5" />
      </button>
      {onToggleFullscreen && (
        <button type="button" onClick={onToggleFullscreen} title={fullLabel} aria-label={fullLabel} className={BUTTON}>
          {fullscreen ? <Minimize className="h-[18px] w-[18px]" /> : <Maximize className="h-[18px] w-[18px]" />}
        </button>
      )}
    </div>
  );
}

/** The "PRO" finish over a map: a soft vignette at the edges and a haze toward the top, where a tilted map meets its horizon. */
export function MapVignette() {
  return <div aria-hidden className="map-pro-vignette pointer-events-none absolute inset-0 z-[1]" />;
}
