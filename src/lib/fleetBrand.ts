/**
 * The little coloured tag that opens a plate on the map ("DH ER643VY"): the first letters of the client the vehicle works for,
 * in that client's colours. Pure helpers; MapView turns the result into CSS (a Google Maps label is a single piece of text, so the
 * tag is drawn with a ::before rule on the label's class).
 */

/** Gamonal's own vehicles, shown through Gamonal Driver, carry no fleetGroup. */
export const GAMONAL_FLEET = "GAMONAL";

export interface FleetColors {
  /** Tag background. */
  bg: string;
  /** Tag letters. */
  fg: string;
}

/** Colours taken from each client's logo (key: the fleet name, upper-case). */
const BRAND_COLORS: Record<string, FleetColors> = {
  DHL: { bg: "#FFCC00", fg: "#D40511" }, // yellow and red
  GAMONAL: { bg: "#16396B", fg: "#5CCB82" }, // navy and green of the Gamonal logo (green lightened to read on navy)
  PIAZZA: { bg: "#1565C0", fg: "#FFFFFF" }, // the blue globe of Piazza Spedizioni
};

/** A client without known brand colours still gets a steady one, so its plates are told apart. */
const FALLBACK_PALETTE: FleetColors[] = [
  { bg: "#0F766E", fg: "#FFFFFF" },
  { bg: "#7C3AED", fg: "#FFFFFF" },
  { bg: "#B45309", fg: "#FFFFFF" },
  { bg: "#BE123C", fg: "#FFFFFF" },
  { bg: "#334155", fg: "#FFFFFF" },
];

const key = (fleet: string): string => fleet.trim().toUpperCase();
const letters = (fleet: string): string => key(fleet).replace(/[^A-Z0-9]/g, "");

export function fleetColors(fleet: string): FleetColors {
  const known = BRAND_COLORS[key(fleet)];
  if (known) return known;
  let hash = 0;
  for (const ch of key(fleet)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]!;
}

/**
 * The tag of each fleet: its first two letters; where two fleets would start alike ("DHL" and "DHX"), the colliding ones grow a
 * letter at a time until they differ (or run out of letters).
 */
export function fleetPrefixes(fleets: ReadonlyArray<string>): Map<string, string> {
  const names = [...new Set(fleets.map(key).filter((f) => letters(f).length > 0))].sort();
  const length = new Map(names.map((n) => [n, Math.min(2, letters(n).length)]));
  const prefix = (n: string) => letters(n).slice(0, length.get(n));

  for (let changed = true; changed; ) {
    changed = false;
    const byPrefix = new Map<string, string[]>();
    for (const n of names) byPrefix.set(prefix(n), [...(byPrefix.get(prefix(n)) ?? []), n]);
    for (const group of byPrefix.values()) {
      if (group.length < 2) continue;
      for (const n of group) {
        if (length.get(n)! < letters(n).length) {
          length.set(n, length.get(n)! + 1);
          changed = true;
        }
      }
    }
  }
  return new Map(names.map((n) => [n, prefix(n)]));
}

/** The class a plate label gets for a fleet (safe to use in CSS). */
export function fleetClass(fleet: string): string {
  return `plate-fleet-${letters(fleet).toLowerCase() || "x"}`;
}

/** CSS for the tags of these fleets: one rule per fleet, setting the letters and colours the shared `.vehicle-plate-label` ::before uses. */
export function fleetTagCss(fleets: ReadonlyArray<string>): string {
  const prefixes = fleetPrefixes(fleets);
  return [...prefixes]
    .map(([fleet, prefix]) => {
      const { bg, fg } = fleetColors(fleet);
      return `.${fleetClass(fleet)}{--fleet-tag:"${prefix}";--fleet-bg:${bg};--fleet-fg:${fg}}`;
    })
    .join("\n");
}
