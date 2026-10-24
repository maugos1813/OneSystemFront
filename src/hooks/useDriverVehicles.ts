import { useEffect, useState } from "react";
import { listDriverVehicles } from "../lib/api";
import type { SharedVehicle } from "../lib/types";

const REFRESH_MS = 20_000;

/** The Gamonal vehicles Gamonal Driver lets this person see on the map, refreshed while the page is open. */
export function useDriverVehicles(enabled: boolean): SharedVehicle[] {
  const [vehicles, setVehicles] = useState<SharedVehicle[]>([]);

  useEffect(() => {
    if (!enabled) {
      setVehicles([]);
      return;
    }
    let cancelled = false;
    const load = () => {
      if (document.visibilityState === "hidden") return;
      listDriverVehicles()
        .then((list) => !cancelled && setVehicles(list))
        // Without them the map simply shows the person's own vehicles.
        .catch(() => undefined);
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled]);

  return vehicles;
}
