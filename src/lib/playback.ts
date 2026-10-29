import { norm, shortestTurn } from "./driveCamera";
import type { Position } from "./types";

/** Longest stretch between two reports that plays back as it happened: a vehicle parked for an hour does not make the
 * playback wait an hour, it waits this long. */
export const GAP_CAP_MS = 60_000;

/** How many times faster than real life the playback can run. */
export const PLAYBACK_RATES = [1, 2, 5, 10, 30, 60] as const;
export const DEFAULT_PLAYBACK_RATE = 5;

/** For each report, the milliseconds of playback it sits at (0 for the first). Real time between reports, with long
 * stops shortened to GAP_CAP_MS. */
export function buildTimeline(positions: readonly Position[]): number[] {
  const timeline: number[] = [];
  let at = 0;
  for (let i = 0; i < positions.length; i++) {
    if (i > 0) {
      const gap = new Date(positions[i]!.ts).getTime() - new Date(positions[i - 1]!.ts).getTime();
      at += Math.min(Math.max(gap, 0), GAP_CAP_MS);
    }
    timeline.push(at);
  }
  return timeline;
}

/** The report the playback clock is at, and how far (0..1) it is toward the next one. */
export function locate(timeline: readonly number[], ms: number): { index: number; frac: number } {
  if (timeline.length === 0) return { index: 0, frac: 0 };
  let lo = 0;
  let hi = timeline.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (timeline[mid]! <= ms) lo = mid;
    else hi = mid - 1;
  }
  const next = timeline[lo + 1];
  const span = next === undefined ? 0 : next - timeline[lo]!;
  return { index: lo, frac: span > 0 ? Math.min(1, (ms - timeline[lo]!) / span) : 0 };
}

/** The position between two reports, so the vehicle glides along the route instead of jumping from report to report. */
export function interpolatePosition(a: Position, b: Position | undefined, frac: number): Position {
  if (!b || frac <= 0) return a;
  return {
    ...a,
    lat: a.lat + (b.lat - a.lat) * frac,
    lng: a.lng + (b.lng - a.lng) * frac,
    angle: norm(a.angle + shortestTurn(a.angle, b.angle) * frac),
    speed: a.speed + (b.speed - a.speed) * frac,
  };
}
