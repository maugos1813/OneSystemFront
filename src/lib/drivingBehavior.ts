import { detectHarshEvents } from "./drivingStyle";
import type { Position } from "./types";

const POINTS_PER_INCIDENT = 6;

/** Consecutive over-limit samples count as a single speeding episode, so it's scored
 * the same way as the other categories — per incident, not per raw GPS sample (which
 * would unfairly tank the score for one long stretch of speeding reported every 15s). */
export function countSpeedingEpisodes(positions: Position[], limitKmh: number): number {
  let episodes = 0;
  let inEpisode = false;
  for (const p of positions) {
    if (p.speed > limitKmh) {
      if (!inEpisode) episodes++;
      inEpisode = true;
    } else {
      inEpisode = false;
    }
  }
  return episodes;
}

function scoreFromIncidentCount(count: number): number {
  return Math.max(1, Math.min(100, 100 - count * POINTS_PER_INCIDENT));
}

export interface CategoryCounts {
  harshBraking: number;
  harshAcceleration: number;
  harshCornering: number;
  speeding: number;
}

export interface CategoryScores extends CategoryCounts {
  overall: number;
  counts: CategoryCounts;
}

/** Every score is 1-100 — 100 is spotless, 1 is as bad as the scale goes (never 0, so a
 * bar is always at least a sliver visible). `positions` must be ordered oldest -> newest. */
export function computeCategoryScores(positions: Position[], speedLimitKmh: number): CategoryScores {
  const harshEvents = detectHarshEvents(positions);
  const counts: CategoryCounts = {
    harshBraking: harshEvents.filter((e) => e.type === "braking").length,
    harshAcceleration: harshEvents.filter((e) => e.type === "acceleration").length,
    harshCornering: harshEvents.filter((e) => e.type === "cornering").length,
    speeding: countSpeedingEpisodes(positions, speedLimitKmh),
  };

  const harshBraking = scoreFromIncidentCount(counts.harshBraking);
  const harshAcceleration = scoreFromIncidentCount(counts.harshAcceleration);
  const harshCornering = scoreFromIncidentCount(counts.harshCornering);
  const speeding = scoreFromIncidentCount(counts.speeding);
  const overall = Math.round((harshBraking + harshAcceleration + harshCornering + speeding) / 4);

  return { harshBraking, harshAcceleration, harshCornering, speeding, overall, counts };
}

export function scoreColor(score: number): string {
  if (score >= 90) return "#16a34a";
  if (score >= 75) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#dc2626";
}

export function scoreGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}
