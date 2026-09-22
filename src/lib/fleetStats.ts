import { isOffline } from "./alerts";
import { AVL_ID, type Device, type Position, type Vehicle } from "./types";

export type VehicleState = "off" | "idle" | "moving";

export function classifyVehicleState(position: Position | undefined): VehicleState {
  if (!position) return "off";
  if (position.speed > 0) return "moving";
  const ignitionOn = position.ioData[AVL_ID.IGNITION] === 1 || position.ioData[AVL_ID.IGNITION] === "1";
  return ignitionOn ? "idle" : "off";
}

export interface FleetSummary {
  total: number;
  online: number;
  moving: number;
  avgSpeedMoving: number;
}

export function computeFleetSummary(
  vehicles: Vehicle[],
  devices: Device[],
  positions: Record<string, Position>,
): FleetSummary {
  const deviceById = new Map(devices.map((d) => [d.id, d]));
  let online = 0;
  let moving = 0;
  let speedSum = 0;

  for (const vehicle of vehicles) {
    const device = vehicle.deviceId ? deviceById.get(vehicle.deviceId) : undefined;
    if (device && !isOffline(device.lastSeenAt)) online += 1;

    const position = positions[vehicle.id];
    if (position && position.speed > 0) {
      moving += 1;
      speedSum += position.speed;
    }
  }

  return {
    total: vehicles.length,
    online,
    moving,
    avgSpeedMoving: moving > 0 ? Math.round(speedSum / moving) : 0,
  };
}

export interface StateDistributionEntry {
  state: VehicleState;
  count: number;
}

export function computeStateDistribution(
  vehicles: Vehicle[],
  positions: Record<string, Position>,
): StateDistributionEntry[] {
  const counts: Record<VehicleState, number> = { off: 0, idle: 0, moving: 0 };
  for (const vehicle of vehicles) {
    counts[classifyVehicleState(positions[vehicle.id])] += 1;
  }
  return (["off", "idle", "moving"] as const).map((state) => ({ state, count: counts[state] }));
}

export interface OdometerEntry {
  vehicleId: string;
  vehicleName: string;
  km: number;
}

/** Ranking by AVL 16 (Total Odometer, reported in meters), highest first. */
export function computeOdometerRanking(
  vehicles: Vehicle[],
  positions: Record<string, Position>,
): OdometerEntry[] {
  return vehicles
    .map((vehicle) => {
      const meters = Number(positions[vehicle.id]?.ioData[AVL_ID.TOTAL_ODOMETER] ?? 0);
      return { vehicleId: vehicle.id, vehicleName: vehicle.name, km: Math.round(meters / 100) / 10 };
    })
    .sort((a, b) => b.km - a.km);
}
