import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Alert } from "../lib/alerts";
import { forgetGoneNotices, loadSeen, markSeen, saveSeen, unseenAlerts, type SeenRecord } from "../lib/seenAlerts";

/**
 * What the bell has not shown this person yet. Opening the bell and closing it marks what it listed as seen, so the same notice
 * does not come back (nor count on the badge) every time the app is opened: it comes back only if the condition ended and
 * returned later. The record is per person and per device, in the browser's storage.
 */
export function useSeenAlerts(userId: string | undefined, alerts: readonly Alert[]) {
  const [seen, setSeen] = useState<SeenRecord>({});
  const lastLive = useRef(new Map<string, number>());

  // Whoever is signed in has their own record: switching account on the same device never inherits another person's.
  useEffect(() => {
    lastLive.current = new Map();
    setSeen(userId ? loadSeen(userId) : {});
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setSeen((current) => {
      const next = forgetGoneNotices(current, alerts, lastLive.current, Date.now());
      if (next !== current) saveSeen(userId, next);
      return next;
    });
  }, [alerts, userId]);

  const unseen = useMemo(() => unseenAlerts(alerts, seen), [alerts, seen]);

  const markAllSeen = useCallback(
    (shown: readonly Alert[]) => {
      if (!userId || shown.length === 0) return;
      setSeen((current) => {
        const next = markSeen(current, shown, Date.now());
        saveSeen(userId, next);
        return next;
      });
    },
    [userId],
  );

  return { unseen, markAllSeen };
}
