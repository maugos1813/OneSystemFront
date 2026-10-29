import { useEffect, useState } from "react";
import { getVehicleIncidents } from "../lib/api";
import type { Incident } from "../lib/drivingBehavior";

const SPEED_LIMIT_DEBOUNCE_MS = 500;

/**
 * The harsh braking / acceleration / cornering and speeding events of one vehicle over the last `days` days, with where
 * each happened, calculated on the server (the same ones the Conducción page lists). Empty while loading, and also when
 * the account may not see driving data (the server answers 403): the map then simply has no pins.
 */
export function useVehicleIncidents(vehicleId: string | null, days: number, speedLimit: number): Incident[] {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    setIncidents([]);
    if (!vehicleId) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      getVehicleIncidents(vehicleId, { days, speedLimit })
        .then((result) => !cancelled && setIncidents(result.incidents))
        .catch(() => undefined);
    }, SPEED_LIMIT_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [vehicleId, days, speedLimit]);

  return incidents;
}
