import type { Position } from "./types";

export interface SpeedViolation {
  index: number;
  ts: string;
  speed: number;
}

/** Every sample that exceeds `limitKmh`. */
export function findSpeedViolations(positions: Position[], limitKmh: number): SpeedViolation[] {
  return positions
    .map((p, index) => ({ index, ts: p.ts, speed: p.speed }))
    .filter((p) => p.speed > limitKmh);
}

export interface RouteSegment {
  path: Array<{ lat: number; lng: number }>;
  violation: boolean;
}

/**
 * Groups the route into runs of "under limit" / "over limit" so the map draws a handful
 * of colored polylines instead of one per pair of points — keeps it readable instead of
 * a cluttered mess of segments.
 */
export function buildRouteSegments(positions: Position[], limitKmh: number): RouteSegment[] {
  if (positions.length < 2) return [];

  const segments: RouteSegment[] = [];
  let currentViolation = positions[0]!.speed > limitKmh;
  let current: Array<{ lat: number; lng: number }> = [{ lat: positions[0]!.lat, lng: positions[0]!.lng }];

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1]!;
    const curr = positions[i]!;
    const segmentIsViolation = prev.speed > limitKmh || curr.speed > limitKmh;

    if (segmentIsViolation !== currentViolation) {
      current.push({ lat: prev.lat, lng: prev.lng });
      segments.push({ path: current, violation: currentViolation });
      current = [{ lat: prev.lat, lng: prev.lng }];
      currentViolation = segmentIsViolation;
    }
    current.push({ lat: curr.lat, lng: curr.lng });
  }

  segments.push({ path: current, violation: currentViolation });
  return segments;
}
