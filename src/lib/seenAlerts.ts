import type { Alert } from "./alerts";

/** How long a seen notice may stay out of the list before it counts as gone: if it comes back after this, it is news again. */
export const SEEN_FORGET_AFTER_MS = 15 * 60_000;

/** What identifies one notice: the same condition on the same vehicle is the same notice; a momentary event (a geofence crossing) is one per moment. */
export function alertKey(alert: Alert): string {
  return [alert.type, alert.vehicleId, alert.since ?? ""].join("|");
}

/** The notices the person has seen, by key (the value is when they were marked). */
export type SeenRecord = Record<string, number>;

const storageKey = (userId: string) => `onesystem.alertsSeen.${userId}`;

export function loadSeen(userId: string): SeenRecord {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    const clean: SeenRecord = {};
    for (const [key, at] of Object.entries(parsed)) if (typeof at === "number") clean[key] = at;
    return clean;
  } catch {
    return {};
  }
}

export function saveSeen(userId: string, seen: SeenRecord): void {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(seen));
  } catch {
    /* private mode or full storage: the notices just show again next time */
  }
}

/**
 * Keeps the record of seen notices honest as the live list changes. `lastLive` remembers (in memory) when each seen notice was
 * last in the list: one still there is refreshed, and one that has been gone longer than `SEEN_FORGET_AFTER_MS` is dropped, so
 * that if it returns it shows up as new. The wait covers the moments the list is empty only because the data is still loading.
 * Returns the same object when nothing was dropped.
 */
export function forgetGoneNotices(seen: SeenRecord, live: readonly Alert[], lastLive: Map<string, number>, now: number): SeenRecord {
  const liveKeys = new Set(live.map(alertKey));
  let next: SeenRecord | null = null;
  for (const key of Object.keys(seen)) {
    if (liveKeys.has(key)) {
      lastLive.set(key, now);
      continue;
    }
    if (!lastLive.has(key)) lastLive.set(key, now); // first time this run: the clock starts now
    if (now - lastLive.get(key)! > SEEN_FORGET_AFTER_MS) {
      next ??= { ...seen };
      delete next[key];
      lastLive.delete(key);
    }
  }
  return next ?? seen;
}

/** The notices the person has not seen yet. */
export function unseenAlerts(alerts: readonly Alert[], seen: SeenRecord): Alert[] {
  return alerts.filter((alert) => !(alertKey(alert) in seen));
}

/** Marks these notices as seen as of `now`. */
export function markSeen(seen: SeenRecord, alerts: readonly Alert[], now: number): SeenRecord {
  const next = { ...seen };
  for (const alert of alerts) next[alertKey(alert)] = now;
  return next;
}
