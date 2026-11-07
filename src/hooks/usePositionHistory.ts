import { useEffect, useState } from "react";
import { getPositionHistory } from "../lib/api";
import type { Position } from "../lib/types";

/** The route of a vehicle from `from` to `to` (now when omitted), spread over at most 5000 points (the speeding peaks stay). */
export function usePositionHistory(vehicleId: string | null, from: Date | null, to: Date | null = null) {
  const [history, setHistory] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehicleId || !from) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getPositionHistory(vehicleId, { from, ...(to ? { to } : {}), maxPoints: 5000 })
      .then((rows) => {
        if (!cancelled) setHistory(rows.slice().reverse()); // oldest -> newest, for drawing a route
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [vehicleId, from, to]);

  return { history, loading };
}
