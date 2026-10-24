import type { Translate } from "../i18n";

/** "12s ago", "3min ago", "2h ago", "1d ago" — in the reader's language. */
export function formatRelativeTime(iso: string, t: Translate): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return t("time.secondsAgo", { count: seconds });
  if (seconds < 3600) return t("time.minutesAgo", { count: Math.round(seconds / 60) });
  if (seconds < 86400) return t("time.hoursAgo", { count: Math.round(seconds / 3600) });
  return t("time.daysAgo", { count: Math.round(seconds / 86400) });
}
