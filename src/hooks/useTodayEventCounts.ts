import { useEffect, useState } from "react";
import { getDeviceEvents } from "../lib/api";
import type { Vehicle } from "../lib/types";

export interface TodayEventCounts {
  ignitionChanges: number;
  movementChanges: number;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function useTodayEventCounts(vehicles: Vehicle[]) {
  const [counts, setCounts] = useState<TodayEventCounts>({ ignitionChanges: 0, movementChanges: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicles.length === 0) {
      setCounts({ ignitionChanges: 0, movementChanges: 0 });
      return;
    }

    let cancelled = false;
    setLoading(true);
    const from = startOfToday();

    Promise.all(vehicles.map((v) => getDeviceEvents(v.id, { from, limit: 1000 })))
      .then((results) => {
        if (cancelled) return;
        let ignitionChanges = 0;
        let movementChanges = 0;
        for (const events of results) {
          for (const event of events) {
            if (event.type === "ignition_change") ignitionChanges += 1;
            if (event.type === "movement_change") movementChanges += 1;
          }
        }
        setCounts({ ignitionChanges, movementChanges });
      })
      .catch(() => {
        if (!cancelled) setCounts({ ignitionChanges: 0, movementChanges: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the set of vehicle ids changes
  }, [vehicles.map((v) => v.id).join(",")]);

  return { counts, loading };
}
