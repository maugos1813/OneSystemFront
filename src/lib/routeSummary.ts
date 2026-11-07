import { haversineKm } from "./geo";
import type { Position } from "./types";

export interface RouteSummary {
  /** Time of the first and last report of the route. */
  start: string;
  end: string;
  /** Kilometres along the route (straight lines between reports). */
  distanceKm: number;
  /** The fastest report, km/h. */
  maxSpeed: number;
  /** Average of the reports in which the vehicle was moving, km/h; 0 when it never moved. */
  avgSpeed: number;
}

/** What a route adds up to, for the card beside the map. `positions` go from the oldest to the newest. */
export function routeSummary(positions: readonly Position[]): RouteSummary | null {
  if (positions.length < 2) return null;
  let distanceKm = 0;
  let maxSpeed = 0;
  let movingSum = 0;
  let moving = 0;
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]!;
    if (i > 0) distanceKm += haversineKm(positions[i - 1]!, p);
    if (p.speed > maxSpeed) maxSpeed = p.speed;
    if (p.speed > 0) {
      movingSum += p.speed;
      moving += 1;
    }
  }
  return {
    start: positions[0]!.ts,
    end: positions[positions.length - 1]!.ts,
    distanceKm,
    maxSpeed: Math.round(maxSpeed),
    avgSpeed: moving > 0 ? Math.round(movingSum / moving) : 0,
  };
}
