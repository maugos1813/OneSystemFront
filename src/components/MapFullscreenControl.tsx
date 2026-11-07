import { useMap } from "@vis.gl/react-google-maps";
import { Maximize, Minimize } from "lucide-react";
import { useEffect } from "react";
import { useT } from "../i18n";

/** Inside the map: when the page makes the map bigger or smaller (see useInAppFullscreen), tells it to measure itself again. */
export function MapResizeOnChange({ trigger }: { trigger: unknown }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => google.maps.event.trigger(map, "resize"), 60);
    return () => clearTimeout(timer);
  }, [map, trigger]);
  return null;
}

/**
 * The full-screen button of a map. It sits over the map as an ordinary button of the page, not inside Google's own control layer:
 * there, on an Android phone, the map's touch handling swallowed the tap and the button did nothing. It asks the browser for nothing
 * either (a phone has no full screen for a map), it only tells the page.
 */
export function MapFullscreenButton({ full, onToggle, className }: { full: boolean; onToggle: () => void; className: string }) {
  const t = useT();
  const label = full ? t("map.exitFullscreen") : t("map.fullscreen");
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      className={`absolute z-10 flex h-10 w-10 touch-manipulation items-center justify-center rounded-lg bg-white text-slate-700 shadow-md ring-1 ring-black/10 hover:bg-slate-50 active:scale-95 ${className}`}
    >
      {full ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
    </button>
  );
}
