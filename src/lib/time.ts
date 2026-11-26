/**
 * Every hour on screen is the fleet's own wall clock (Italy), whatever the time zone of the phone or computer that is looking.
 * The server stores exact instants (UTC); the zone below is an IANA name, so summer/winter time (CEST/CET) is applied by the
 * platform on the right dates — nothing here counts "+1" or "+2" by hand.
 */
export const FLEET_TIME_ZONE = "Europe/Rome";

/** A day as yyyy-mm-dd. */
export type FleetDay = string;

type Input = Date | string | number;
const toDate = (input: Input): Date => (input instanceof Date ? input : new Date(input));

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, { ...options, timeZone: FLEET_TIME_ZONE });
    formatters.set(key, cached);
  }
  return cached;
}

const DATE_ONLY: Intl.DateTimeFormatOptions = { year: "numeric", month: "numeric", day: "numeric" };
const DATE_TIME: Intl.DateTimeFormatOptions = { ...DATE_ONLY, hour: "numeric", minute: "2-digit", second: "2-digit" };

/** An Intl.DateTimeFormat that always reads in fleet time (for code that formats many values with the same options). */
export const fleetFormat = (locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => formatter(locale, options);

/** "14:35" (hours and minutes) in fleet time. */
export function formatTime(input: Input, locale?: string, withSeconds = false): string {
  return formatter(locale, { hour: "2-digit", minute: "2-digit", ...(withSeconds ? { second: "2-digit" } : {}) }).format(toDate(input));
}

/** "12/11/2026, 14:35:07" in fleet time. */
export function formatDateTime(input: Input, locale?: string, options?: Intl.DateTimeFormatOptions): string {
  return formatter(locale, options ?? DATE_TIME).format(toDate(input));
}

/** "12/11/2026" in fleet time. */
export function formatDate(input: Input, locale?: string, options?: Intl.DateTimeFormatOptions): string {
  return formatter(locale, options ?? DATE_ONLY).format(toDate(input));
}

interface FleetParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** The calendar and clock fields of an instant as they read in fleet time. */
export function fleetParts(input: Input): FleetParts {
  const parts = formatter("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(toDate(input));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAYS[get("weekday")] ?? 0,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The fleet-time calendar day an instant falls on. */
export function fleetDayOf(input: Input): FleetDay {
  const { year, month, day } = fleetParts(input);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Today, in fleet time. */
export const fleetToday = (): FleetDay => fleetDayOf(new Date());

/** Milliseconds fleet time is ahead of UTC at that instant (+1 h in winter, +2 h in summer). */
function offsetMs(at: number): number {
  const p = fleetParts(at);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at / 1000) * 1000;
}

/** The instant at which the fleet-time wall clock reads `day` `hh:mm:ss.mmm`. */
function fleetWallClock(day: FleetDay, hour: number, minute: number, second: number, ms: number): Date {
  const [year = 1970, month = 1, date = 1] = day.split("-").map(Number);
  const asIfUtc = Date.UTC(year, month - 1, date, hour, minute, second, ms);
  // The offset depends on the date itself (summer time), so settle it with a second pass around a change of hour.
  let utc = asIfUtc - offsetMs(asIfUtc);
  utc = asIfUtc - offsetMs(utc);
  return new Date(utc);
}

/** 00:00:00 of a fleet-time day. */
export const fleetStartOfDay = (day: FleetDay): Date => fleetWallClock(day, 0, 0, 0, 0);

/** 23:59:59.999 of a fleet-time day. */
export const fleetEndOfDay = (day: FleetDay): Date => fleetWallClock(day, 23, 59, 59, 999);

/** 00:00:00 of today, in fleet time: where "today" starts for the counters and summaries. */
export const fleetStartOfToday = (): Date => fleetStartOfDay(fleetToday());
