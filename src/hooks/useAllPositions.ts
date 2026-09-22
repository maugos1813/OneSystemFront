import { useEffect, useState } from "react";
import { getLatestPosition } from "../lib/api";
import type { Position, Vehicle } from "../lib/types";

const POLL_INTERVAL_MS = 5000;

/** Latest known position per vehicle, refreshed every 5s — used to place map markers. */
export function useAllPositions(vehicles: Vehicle[]) {
  const [positions, setPositions] = useState<Record<string, Position>>({});

  useEffect(() => {
    if (vehicles.length === 0) return;

    let cancelled = false;

    const fetchAll = async () => {
      const results = await Promise.all(
        vehicles.map(async (v) => [v.id, await getLatestPosition(v.id)] as const),
      );
      if (cancelled) return;
      setPositions((prev) => {
        const next = { ...prev };
        for (const [vehicleId, position] of results) {
          if (position) next[vehicleId] = position;
        }
        return next;
      });
    };

    fetchAll();
    const interval = setInterval(fetchAll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the set of vehicle ids changes
  }, [vehicles.map((v) => v.id).join(",")]);

  return positions;
}
