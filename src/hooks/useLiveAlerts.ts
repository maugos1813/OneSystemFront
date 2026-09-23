import { useEffect, useMemo, useRef } from "react";
import { computeAlerts, isIgnitionOn, type Alert } from "../lib/alerts";
import { isInsideGeofence } from "../lib/geo";
import type { Device, Geofence, OrgSettings, Position, Vehicle } from "../lib/types";

const GEOFENCE_EVENT_TTL_MS = 30 * 60 * 1000; // a crossing stays in the alert list for 30 min

interface GeofenceEvent {
  vehicleId: string;
  vehicleName: string;
  geofenceName: string;
  type: "geofence_enter" | "geofence_exit";
  ts: number;
}

/**
 * Adds the two alert types that need memory of a previous check — excessive idling (how
 * long has it been running-but-stopped) and geofence crossings (did it just enter/exit) —
 * on top of the stateless checks in lib/alerts.ts. Tracked in refs and re-evaluated every
 * time `positions` changes (FleetContext polls every 5s), so there's a small — harmless —
 * lag between a ref update and it showing up in the returned list.
 */
export function useLiveAlerts(
  vehicles: Vehicle[],
  devices: Device[],
  positions: Record<string, Position>,
  settings: OrgSettings | null,
  geofences: Geofence[],
): Alert[] {
  const idlingStart = useRef<Map<string, number>>(new Map());
  const insideGeofence = useRef<Map<string, boolean>>(new Map());
  const geofenceEvents = useRef<GeofenceEvent[]>([]);

  useEffect(() => {
    if (!settings) return;

    for (const vehicle of vehicles) {
      const position = positions[vehicle.id];
      if (!position) continue;

      const idling = isIgnitionOn(position) && position.speed === 0;
      if (idling) {
        if (!idlingStart.current.has(vehicle.id)) idlingStart.current.set(vehicle.id, Date.now());
      } else {
        idlingStart.current.delete(vehicle.id);
      }

      if (settings.alerts.geofenceEnabled) {
        for (const gf of geofences) {
          const key = `${vehicle.id}:${gf.id}`;
          const inside = isInsideGeofence(position, gf);
          const seenBefore = insideGeofence.current.has(key);
          const wasInside = insideGeofence.current.get(key);
          insideGeofence.current.set(key, inside);

          if (!seenBefore) continue; // don't fire a crossing on the very first observation
          if (inside && !wasInside && gf.alertOnEnter) {
            geofenceEvents.current = [
              ...geofenceEvents.current,
              { vehicleId: vehicle.id, vehicleName: vehicle.name, geofenceName: gf.name, type: "geofence_enter", ts: Date.now() },
            ];
          } else if (!inside && wasInside && gf.alertOnExit) {
            geofenceEvents.current = [
              ...geofenceEvents.current,
              { vehicleId: vehicle.id, vehicleName: vehicle.name, geofenceName: gf.name, type: "geofence_exit", ts: Date.now() },
            ];
          }
        }
      }
    }

    const cutoff = Date.now() - GEOFENCE_EVENT_TTL_MS;
    geofenceEvents.current = geofenceEvents.current.filter((e) => e.ts >= cutoff);
  }, [vehicles, positions, geofences, settings]);

  return useMemo(() => {
    if (!settings) return [];
    const alerts = computeAlerts(vehicles, devices, positions, settings);

    if (settings.alerts.excessiveIdlingEnabled) {
      const thresholdMs = settings.alerts.excessiveIdlingMinutes * 60_000;
      for (const vehicle of vehicles) {
        const start = idlingStart.current.get(vehicle.id);
        if (start && Date.now() - start >= thresholdMs) {
          alerts.push({
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            type: "excessive_idling",
            message: `${vehicle.name} lleva motor encendido y detenido más de ${settings.alerts.excessiveIdlingMinutes} min`,
          });
        }
      }
    }

    for (const event of geofenceEvents.current) {
      alerts.push({
        vehicleId: event.vehicleId,
        vehicleName: event.vehicleName,
        type: event.type,
        message:
          event.type === "geofence_enter"
            ? `${event.vehicleName} entró a "${event.geofenceName}"`
            : `${event.vehicleName} salió de "${event.geofenceName}"`,
        since: new Date(event.ts).toISOString(),
      });
    }

    return alerts;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- also reads idlingStart/geofenceEvents refs, kept current by the effect above
  }, [vehicles, devices, positions, settings, geofences]);
}
