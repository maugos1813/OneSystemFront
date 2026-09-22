import type { Position } from "./types";

export type HarshEventType = "braking" | "acceleration" | "cornering";

export interface HarshEvent {
  type: HarshEventType;
  ts: string;
}

// Estimated from consecutive GPS samples — noisier than the device's own accelerometer,
// but works today with zero device reconfiguration. See OneSystemBack's Green Driving
// notes for the more precise alternative (AVL IDs 253/254).
const SPEED_DELTA_THRESHOLD_KMH = 20;
const CORNERING_ANGLE_THRESHOLD_DEG = 45;
const MIN_SPEED_FOR_CORNERING_KMH = 20;
const MAX_SAMPLE_GAP_MS = 15_000;

/** `positions` must be ordered oldest -> newest. */
export function detectHarshEvents(positions: Position[]): HarshEvent[] {
  const events: HarshEvent[] = [];

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1]!;
    const curr = positions[i]!;
    const dtMs = new Date(curr.ts).getTime() - new Date(prev.ts).getTime();
    if (dtMs <= 0 || dtMs > MAX_SAMPLE_GAP_MS) continue;

    const speedDelta = curr.speed - prev.speed;
    if (speedDelta <= -SPEED_DELTA_THRESHOLD_KMH) {
      events.push({ type: "braking", ts: curr.ts });
    } else if (speedDelta >= SPEED_DELTA_THRESHOLD_KMH) {
      events.push({ type: "acceleration", ts: curr.ts });
    }

    if (prev.speed >= MIN_SPEED_FOR_CORNERING_KMH && curr.speed >= MIN_SPEED_FOR_CORNERING_KMH) {
      let angleDelta = Math.abs(curr.angle - prev.angle);
      if (angleDelta > 180) angleDelta = 360 - angleDelta;
      if (angleDelta >= CORNERING_ANGLE_THRESHOLD_DEG) {
        events.push({ type: "cornering", ts: curr.ts });
      }
    }
  }

  return events;
}

export interface DrivingScore {
  score: number;
  grade: string;
  color: string;
}

const GRADE_THRESHOLDS: Array<{ min: number; grade: string; color: string }> = [
  { min: 90, grade: "A+", color: "#16a34a" },
  { min: 75, grade: "A", color: "#22c55e" },
  { min: 60, grade: "B", color: "#f59e0b" },
  { min: 40, grade: "C", color: "#f97316" },
  { min: 0, grade: "D", color: "#dc2626" },
];

export function computeDrivingScore(events: HarshEvent[]): DrivingScore {
  const score = Math.max(0, Math.min(100, 100 - events.length * 6));
  const tier = GRADE_THRESHOLDS.find((t) => score >= t.min)!;
  return { score, grade: tier.grade, color: tier.color };
}
