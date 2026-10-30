import type { Translate } from "../i18n";

/** "12s ago", "3min ago", "2h ago", "1d ago" — in the reader's language. */
export function formatRelativeTime(iso: string, t: Translate): string {
  // A source whose clock is ahead of ours would read "hace -33s"; that is just "now".
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return t("time.secondsAgo", { count: seconds });
  if (seconds < 3600) return t("time.minutesAgo", { count: Math.round(seconds / 60) });
  if (seconds < 86400) return t("time.hoursAgo", { count: Math.round(seconds / 3600) });
  return t("time.daysAgo", { count: Math.round(seconds / 86400) });
}

/**
 * The age of a report in whole minutes ("5min fa"), "adesso" under a minute, and days only from a full day on. A time slightly in the
 * future (the source's clock ahead of the phone's) counts as "now" rather than showing a negative age.
 */
export function formatAgeInMinutes(iso: string, t: Translate): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return t("time.justNow");
  if (minutes >= 24 * 60) return t("time.daysAgo", { count: Math.round(minutes / (24 * 60)) });
  return t("time.minutesAgo", { count: minutes });
}
