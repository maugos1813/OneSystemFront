import { AVL_ID, type Device, type Position, type Vehicle } from "./types";

export const LOW_VOLTAGE_THRESHOLD_MV = 11500; // ~11.5V: weak car battery

export interface Alert {
  vehicleId: string;
  vehicleName: string;
  type: "offline" | "low_voltage";
  message: string;
}

export function isOffline(lastSeenAt: string | null, thresholdMs = 2 * 60 * 1000): boolean {
  if (!lastSeenAt) return true;
  return Date.now() - new Date(lastSeenAt).getTime() > thresholdMs;
}

export function isLowVoltage(position: Position | undefined): boolean {
  if (!position) return false;
  const voltage = Number(position.ioData[AVL_ID.EXTERNAL_VOLTAGE] ?? 0);
  return voltage > 0 && voltage < LOW_VOLTAGE_THRESHOLD_MV;
}

/** Computes the active alerts across every vehicle, from data already fetched
 * by useVehicles/useAllPositions — no extra requests needed. */
export function computeAlerts(
  vehicles: Vehicle[],
  devices: Device[],
  positions: Record<string, Position>,
): Alert[] {
  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const alerts: Alert[] = [];

  for (const vehicle of vehicles) {
    const device = vehicle.deviceId ? deviceById.get(vehicle.deviceId) : undefined;
    if (!device) continue;

    if (isOffline(device.lastSeenAt)) {
      alerts.push({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        type: "offline",
        message: `${vehicle.name} está desconectado`,
      });
    }

    if (isLowVoltage(positions[vehicle.id])) {
      alerts.push({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        type: "low_voltage",
        message: `${vehicle.name} tiene voltaje de batería bajo`,
      });
    }
  }

  return alerts;
}
