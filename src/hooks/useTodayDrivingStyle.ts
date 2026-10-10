import { useEffect, useState } from "react";
import { getDrivingStyle } from "../lib/api";
import type { VehicleDrivingStyle } from "../lib/types";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Today's driving style for one vehicle, calculated on the server (same rules as the
 * Conducción page and the public API). `style` is null while loading or if it fails. */
export function useTodayDrivingStyle(vehicleId: string | null) {
  const [loaded, setLoaded] = useState<{ vehicleId: string; style: VehicleDrivingStyle | null } | null>(null);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;

    getDrivingStyle({ from: startOfToday() })
      .then((result) => {
        if (!cancelled) setLoaded({ vehicleId, style: result.vehicles.find((v) => v.vehicleId === vehicleId) ?? null });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ vehicleId, style: null });
      });

    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  const ready = loaded !== null && loaded.vehicleId === vehicleId;
  return { style: ready ? loaded.style : null, loading: !!vehicleId && !ready };
}
