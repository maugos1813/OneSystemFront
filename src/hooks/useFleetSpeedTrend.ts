import { useEffect, useState } from "react";
import { getPositionHistory } from "../lib/api";
import type { Vehicle } from "../lib/types";

export interface HourlySpeedPoint {
  hour: number;
  avgSpeed: number;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Average fleet speed per hour of today, from every vehicle's position history —
 * no backend changes needed, just aggregates what GET /positions already returns. */
export function useFleetSpeedTrend(vehicles: Vehicle[]) {
  const [points, setPoints] = useState<HourlySpeedPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicles.length === 0) {
      setPoints([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const from = startOfToday();

    Promise.all(vehicles.map((v) => getPositionHistory(v.id, { from, limit: 2000 })))
      .then((results) => {
        if (cancelled) return;

        const buckets = new Map<number, { sum: number; count: number }>();
        for (const positions of results) {
          for (const p of positions) {
            const hour = new Date(p.ts).getHours();
            const bucket = buckets.get(hour) ?? { sum: 0, count: 0 };
            bucket.sum += p.speed;
            bucket.count += 1;
            buckets.set(hour, bucket);
          }
        }

        const currentHour = new Date().getHours();
        const hourly: HourlySpeedPoint[] = [];
        for (let h = 0; h <= currentHour; h++) {
          const bucket = buckets.get(h);
          hourly.push({ hour: h, avgSpeed: bucket ? Math.round(bucket.sum / bucket.count) : 0 });
        }
        setPoints(hourly);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the set of vehicle ids changes
  }, [vehicles.map((v) => v.id).join(",")]);

  return { points, loading };
}
