import { useEffect, useState } from "react";
import { getPositionHistory } from "../lib/api";
import type { Position } from "../lib/types";

export function usePositionHistory(vehicleId: string | null, from: Date | null) {
  const [history, setHistory] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehicleId || !from) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getPositionHistory(vehicleId, { from, limit: 2000 })
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
  }, [vehicleId, from]);

  return { history, loading };
}
