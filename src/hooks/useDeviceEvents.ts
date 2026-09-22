import { useEffect, useState } from "react";
import { getDeviceEvents } from "../lib/api";
import type { DeviceEvent } from "../lib/types";

export function useDeviceEvents(vehicleId: string | null) {
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehicleId) {
      setEvents([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getDeviceEvents(vehicleId, { limit: 20 })
      .then((rows) => {
        if (!cancelled) setEvents(rows);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  return { events, loading };
}
