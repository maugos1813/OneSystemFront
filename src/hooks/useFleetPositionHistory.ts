import { useEffect, useState } from "react";
import { getPositionHistory } from "../lib/api";
import type { Position, Vehicle } from "../lib/types";

/** Full position history for every vehicle over the given range, fetched in parallel. */
export function useFleetPositionHistory(vehicles: Vehicle[], from: Date | null) {
  const [historyByVehicle, setHistoryByVehicle] = useState<Record<string, Position[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicles.length === 0 || !from) {
      setHistoryByVehicle({});
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(
      vehicles.map(async (v) => {
        try {
          const rows = await getPositionHistory(v.id, { from, limit: 2000 });
          return [v.id, rows.slice().reverse()] as const;
        } catch {
          return [v.id, []] as const;
        }
      }),
    )
      .then((results) => {
        if (!cancelled) setHistoryByVehicle(Object.fromEntries(results));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the vehicle set or range start changes
  }, [vehicles.map((v) => v.id).join(","), from?.getTime()]);

  return { historyByVehicle, loading };
}
