import { AVL_ID, type Device, type OrgSettings, type Position, type Vehicle, type WeekdayKey } from "./types";

export const LOW_VOLTAGE_THRESHOLD_MV = 11500; // ~11.5V: weak car battery

export type AlertType =
  | "offline"
  | "low_voltage"
  | "after_hours"
  | "speeding"
  | "excessive_idling"
  | "geofence_enter"
  | "geofence_exit";

export interface Alert {
  vehicleId: string;
  vehicleName: string;
  type: AlertType;
  message: string;
  /** ISO timestamp, for alert types that are momentary events rather than an ongoing state. */
  since?: string;
}

export function isOffline(lastSeenAt: string | null, thresholdMs = 2 * 60 * 1000): boolean {
  if (!lastSeenAt) return true;
  return Date.now() - new Date(lastSeenAt).getTime() > thresholdMs;
}

export function isLowVoltage(position: Position | undefined, thresholdMv = LOW_VOLTAGE_THRESHOLD_MV): boolean {
  if (!position) return false;
  const voltage = Number(position.ioData[AVL_ID.EXTERNAL_VOLTAGE] ?? 0);
  return voltage > 0 && voltage < thresholdMv;
}

export function isSpeeding(position: Position | undefined, limitKmh: number): boolean {
  return !!position && position.speed > limitKmh;
}

export function isIgnitionOn(position: Position | undefined): boolean {
  if (!position) return false;
  return position.ioData[AVL_ID.IGNITION] === 1 || position.ioData[AVL_ID.IGNITION] === "1";
}

const WEEKDAY_ORDER: WeekdayKey[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Whether `date` falls outside the organization's configured working hours for that day —
 * a day with `enabled: false` counts as fully outside (no working hours at all that day). */
export function isAfterHours(date: Date, workingHours: OrgSettings["workingHours"]): boolean {
  const day = WEEKDAY_ORDER[date.getDay()]!;
  const config = workingHours[day];
  if (!config.enabled) return true;

  const minutes = date.getHours() * 60 + date.getMinutes();
  const [startH, startM] = config.start.split(":").map(Number);
  const [endH, endM] = config.end.split(":").map(Number);
  const startMinutes = (startH ?? 0) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 0) * 60 + (endM ?? 0);
  return minutes < startMinutes || minutes > endMinutes;
}

/** The stateless alerts — everything derivable from a single snapshot of positions plus
 * settings, with no memory of what happened a moment ago. Excessive-idling and geofence
 * enter/exit need that memory, so they're computed by the useLiveAlerts hook instead. */
export function computeAlerts(
  vehicles: Vehicle[],
  devices: Device[],
  positions: Record<string, Position>,
  settings: OrgSettings,
): Alert[] {
  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const alerts: Alert[] = [];
  const now = new Date();

  for (const vehicle of vehicles) {
    const device = vehicle.deviceId ? deviceById.get(vehicle.deviceId) : undefined;
    if (!device) continue;
    const position = positions[vehicle.id];

    if (
      settings.alerts.deviceOfflineEnabled &&
      isOffline(device.lastSeenAt, settings.alerts.deviceOfflineHours * 3_600_000)
    ) {
      alerts.push({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        type: "offline",
        message: `${vehicle.name} está desconectado`,
      });
    }

    if (settings.alerts.lowBatteryEnabled && isLowVoltage(position, settings.alerts.lowBatteryVoltage * 1000)) {
      alerts.push({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        type: "low_voltage",
        message: `${vehicle.name} tiene voltaje de batería bajo`,
      });
    }

    if (settings.alerts.speedingEnabled && isSpeeding(position, settings.alerts.speedLimitKmh)) {
      alerts.push({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        type: "speeding",
        message: `${vehicle.name} supera el límite de velocidad (${Math.round(position!.speed)} km/h)`,
      });
    }

    if (settings.alerts.afterHoursEnabled && position) {
      const inUse = position.speed > 0 || isIgnitionOn(position);
      if (inUse && isAfterHours(now, settings.workingHours)) {
        alerts.push({
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          type: "after_hours",
          message: `${vehicle.name} está en uso fuera del horario laboral`,
        });
      }
    }
  }

  return alerts;
}
