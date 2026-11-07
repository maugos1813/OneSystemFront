import { wasParkedWithEngineOff } from "./alerts";
import { AVL_ID, type OrgSettings, type Position } from "./types";

/** What a vehicle is doing right now, as the list, its filters and the badges tell it. */
export type VehicleStatus = "moving" | "stopped" | "offline";

/** How long a tracker may stay quiet before it counts as "sin señal": the same limits the alerts use, so the word and the alert agree. */
export interface StatusThresholds {
  /** A vehicle that was moving and went quiet (the urgent GPS alert). */
  movingSilentMs: number;
  /** A vehicle that was stopped and went quiet (the "dispositivo sin reportar" alert). */
  stoppedSilentMs: number;
}

export const DEFAULT_STATUS_THRESHOLDS: StatusThresholds = { movingSilentMs: 15 * 60_000, stoppedSilentMs: 2 * 3_600_000 };

export function thresholdsFromSettings(settings: OrgSettings | null): StatusThresholds {
  return {
    movingSilentMs: (settings?.alerts.gpsDisconnectSilenceMinutes ?? 15) * 60_000,
    stoppedSilentMs: (settings?.alerts.deviceOfflineHours ?? 2) * 3_600_000,
  };
}

/**
 * Moving, stopped ("Fermo") or no signal. A parked vehicle is not a dead tracker: many go to sleep with the engine off and
 * report rarely, so they stay "parado" however long since the last report. "Sin señal" is what raises an alert: a tracker that
 * stopped reporting while the vehicle was in use, or a stopped one that has been silent past the offline limit.
 */
export function vehicleStatus(
  position: Position | undefined,
  lastSeenAt: string | null,
  thresholds: StatusThresholds = DEFAULT_STATUS_THRESHOLDS,
  now: number = Date.now(),
): VehicleStatus {
  if (!position) return "offline";
  const seen = lastSeenAt ?? position.ts;
  const silentFor = now - new Date(seen).getTime();
  if (wasParkedWithEngineOff(position)) return "stopped";
  if (position.speed > 0) return silentFor > thresholds.movingSilentMs ? "offline" : "moving";
  return silentFor > thresholds.stoppedSilentMs ? "offline" : "stopped";
}

/** Whether the engine is on while stopped (an idling vehicle, the orange dot). */
export function isIdling(position: Position | undefined): boolean {
  const ignition = position?.ioData[AVL_ID.IGNITION];
  return !!position && !(position.speed > 0) && (ignition === 1 || ignition === "1");
}

/** A search term and a text compared without case, spaces, dots or dashes: "ab 123 cd", "AB-123-CD" and "ab123cd" are the same plate. */
export const squash = (text: string | null | undefined): string => (text ?? "").toLowerCase().replace(/[\s.\-_]/g, "");

export function matchesSearch(query: string, ...fields: Array<string | null | undefined>): boolean {
  const needle = squash(query);
  return needle === "" || fields.some((field) => squash(field).includes(needle));
}
