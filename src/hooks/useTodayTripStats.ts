import { useEffect, useMemo, useState } from "react";
import { getPositionHistory } from "../lib/api";
import { computeDrivingScore, detectHarshEvents } from "../lib/drivingStyle";
import { computeTripDistanceKm } from "../lib/geo";
import type { Position } from "../lib/types";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Today's trip so far for a single vehicle: distance, harsh-driving events and score. */
export function useTodayTripStats(vehicleId: string | null) {
  const [history, setHistory] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehicleId) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getPositionHistory(vehicleId, { from: startOfToday(), limit: 2000 })
      .then((rows) => {
        if (!cancelled) setHistory(rows.slice().reverse());
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
  }, [vehicleId]);

  const harshEvents = useMemo(() => detectHarshEvents(history), [history]);
  const score = useMemo(() => computeDrivingScore(harshEvents), [harshEvents]);
  const tripKm = useMemo(() => computeTripDistanceKm(history), [history]);

  return { history, harshEvents, score, tripKm, loading };
}
