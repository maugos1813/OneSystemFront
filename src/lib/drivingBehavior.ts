import type { MessageKey, Translate } from "../i18n";

export type IncidentType = "harshBraking" | "harshAcceleration" | "harshCornering" | "speeding";

export interface Incident {
  type: IncidentType;
  ts: string;
  lat: number;
  lng: number;
  /** Human-readable specifics — a speed delta, an angle, or how far over the limit. */
  detail: string;
  /** The numbers behind `detail` (a server that predates them leaves them out): the screen words them in its own language. */
  speed?: number;
  fromSpeed?: number | null;
  angleDelta?: number | null;
  speedLimit?: number;
}

/** The name of each kind of incident, as a translation key (show it with t()). */
export const INCIDENT_LABELS: Record<IncidentType, MessageKey> = {
  harshBraking: "incident.harshBraking",
  harshAcceleration: "incident.harshAcceleration",
  harshCornering: "incident.harshCornering",
  speeding: "incident.speeding",
};

/** One line about an incident, worded in the language of the screen from the numbers the server sends (the server's own sentence is the fallback). */
export function incidentDetail(t: Translate, incident: Incident): string {
  if (incident.speed === undefined) return incident.detail;
  if (incident.type === "harshCornering") return t("incident.detailCornering", { angle: incident.angleDelta ?? 0, speed: incident.speed });
  if (incident.type === "speeding") return t("incident.detailSpeeding", { speed: incident.speed, limit: incident.speedLimit ?? 0 });
  return `${incident.fromSpeed ?? 0} → ${incident.speed} km/h`;
}

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
