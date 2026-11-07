import { ControlPosition, MapControl, useMap } from "@vis.gl/react-google-maps";
import { Maximize, Minimize } from "lucide-react";
import { useEffect } from "react";
import { useT } from "../i18n";

/**
 * The full-screen button of a map: it does not ask the browser for anything, it only tells the page (see useInAppFullscreen), so it
 * works on a phone and in the Android app. When the page makes the map bigger or smaller the map is told to measure itself again.
 */
export function MapFullscreenControl({
  full,
  onToggle,
  position = ControlPosition.LEFT_BOTTOM,
}: {
  full: boolean;
  onToggle: () => void;
  position?: ControlPosition;
}) {
  const t = useT();
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => google.maps.event.trigger(map, "resize"), 60);
    return () => clearTimeout(timer);
  }, [map, full]);

  const label = full ? t("map.exitFullscreen") : t("map.fullscreen");
  return (
    <MapControl position={position}>
      <button
        type="button"
        onClick={onToggle}
        title={label}
        aria-label={label}
        className="m-2.5 flex h-10 w-10 items-center justify-center rounded-sm bg-white text-slate-700 shadow-md hover:bg-slate-50"
      >
        {full ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
      </button>
    </MapControl>
  );
}
