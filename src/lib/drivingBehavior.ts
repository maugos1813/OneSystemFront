import { detectHarshEvents, type HarshEventType } from "./drivingStyle";
import type { Position } from "./types";

const POINTS_PER_INCIDENT = 6;

export type IncidentType = "harshBraking" | "harshAcceleration" | "harshCornering" | "speeding";

const HARSH_TYPE_MAP: Record<HarshEventType, IncidentType> = {
  braking: "harshBraking",
  acceleration: "harshAcceleration",
  cornering: "harshCornering",
};

export interface Incident {
  type: IncidentType;
  ts: string;
  lat: number;
  lng: number;
  /** Human-readable specifics — a speed delta, an angle, or how far over the limit. */
  detail: string;
}

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  harshBraking: "Frenada brusca",
  harshAcceleration: "Aceleración brusca",
  harshCornering: "Curva brusca",
  speeding: "Exceso de velocidad",
};

export const INCIDENT_COLORS: Record<IncidentType, string> = {
  harshBraking: "#dc2626",
  harshAcceleration: "#f97316",
  harshCornering: "#8b5cf6",
  speeding: "#3b82f6",
};

/** A continuous stretch over the limit counts as one incident, placed at its peak speed —
 * scored and listed the same way as a single harsh-braking/cornering event, instead of
 * one entry per raw GPS sample (which would swamp everything else for one long stretch). */
function speedingIncidents(positions: Position[], limitKmh: number): Incident[] {
  const incidents: Incident[] = [];
  let peak: Position | null = null;

  const flush = () => {
    if (peak) {
      incidents.push({
        type: "speeding",
        ts: peak.ts,
        lat: peak.lat,
        lng: peak.lng,
        detail: `${Math.round(peak.speed)} km/h (límite ${limitKmh})`,
      });
      peak = null;
    }
  };

  for (const p of positions) {
    if (p.speed > limitKmh) {
      if (!peak || p.speed > peak.speed) peak = p;
    } else {
      flush();
    }
  }
  flush();

  return incidents;
}

/** Every harsh-driving + speeding incident in the range, oldest -> newest, each carrying
 * where and when it happened. `positions` must be ordered oldest -> newest. */
export function computeIncidents(positions: Position[], speedLimitKmh: number): Incident[] {
  const harsh: Incident[] = detectHarshEvents(positions).map((e) => ({
    type: HARSH_TYPE_MAP[e.type],
    ts: e.ts,
    lat: e.lat,
    lng: e.lng,
    detail: e.detail,
  }));
  const speeding = speedingIncidents(positions, speedLimitKmh);

  return [...harsh, ...speeding].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
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

function scoreFromIncidentCount(count: number): number {
  return Math.max(1, Math.min(100, 100 - count * POINTS_PER_INCIDENT));
}

/** Every score is 1-100 — 100 is spotless, 1 is as bad as the scale goes (never 0, so a
 * ring or bar always shows at least a sliver). */
export function computeCategoryScores(incidents: Incident[]): CategoryScores {
  const counts: CategoryCounts = {
    harshBraking: incidents.filter((i) => i.type === "harshBraking").length,
    harshAcceleration: incidents.filter((i) => i.type === "harshAcceleration").length,
    harshCornering: incidents.filter((i) => i.type === "harshCornering").length,
    speeding: incidents.filter((i) => i.type === "speeding").length,
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
