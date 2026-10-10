export type IncidentType = "harshBraking" | "harshAcceleration" | "harshCornering" | "speeding";

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

/** Scores are 1-100; they're calculated on the server (see the API's /driving-style). */
export function scoreColor(score: number): string {
  if (score >= 90) return "#16a34a";
  if (score >= 75) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#dc2626";
}

export const NO_SCORE_COLOR = "#94a3b8";
