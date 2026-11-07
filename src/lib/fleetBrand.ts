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
  "ONE DRIVER EXPRESS": { bg: "#FFCC00", fg: "#D40511" }, // the fleet that was DHL: yellow and red
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

const lastWordLetters = (fleet: string): string => letters(key(fleet).split(/\s+/).filter(Boolean).at(-1) ?? "");

/**
 * The tag of each fleet: its first two letters. Where fleets would start alike ("ONE DRIVER EXPRESS" and "ONE DRIVER SALUTE"), names of
 * several words use the start of their last word instead ("EX" and "SA"), which is what tells them apart; any that still collide grow a
 * letter at a time until they differ (or run out of letters).
 */
export function fleetPrefixes(fleets: ReadonlyArray<string>): Map<string, string> {
  const names = [...new Set(fleets.map(key).filter((f) => letters(f).length > 0))].sort();
  const length = new Map(names.map((n) => [n, Math.min(2, letters(n).length)]));
  const byLastWord = new Map<string, string>();
  const prefix = (n: string) => byLastWord.get(n) ?? letters(n).slice(0, length.get(n));

  const groups = () => {
    const byPrefix = new Map<string, string[]>();
    for (const n of names) byPrefix.set(prefix(n), [...(byPrefix.get(prefix(n)) ?? []), n]);
    return [...byPrefix.values()].filter((group) => group.length > 1);
  };

  // First, the colliding names of several words take their last word, when that makes them differ among themselves.
  for (const group of groups()) {
    const candidates = group.filter((n) => n.split(/\s+/).length > 1 && lastWordLetters(n).length >= 2);
    const starts = candidates.map((n) => lastWordLetters(n).slice(0, 2));
    if (candidates.length > 1 && new Set(starts).size === starts.length) candidates.forEach((n, i) => byLastWord.set(n, starts[i]!));
  }

  for (let changed = true; changed; ) {
    changed = false;
    for (const group of groups()) {
      for (const n of group) {
        if (!byLastWord.has(n) && length.get(n)! < letters(n).length) {
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

/** Only a plain image data URL is ever put into CSS (nothing that could close the rule or load something else). */
const SAFE_IMAGE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

/**
 * CSS for the tags of these fleets: one rule per fleet, setting what the shared `.vehicle-plate-label` ::before draws. A fleet with a
 * picture (`logos`, by fleet name) shows the picture; one without keeps its letters in its colours.
 */
export function fleetTagCss(fleets: ReadonlyArray<string>, logos: Readonly<Record<string, string>> = {}): string {
  const prefixes = fleetPrefixes(fleets);
  const picture = new Map(Object.entries(logos).map(([name, logo]) => [key(name), logo]));
  return [...prefixes]
    .map(([fleet, prefix]) => {
      const { bg, fg } = fleetColors(fleet);
      const logo = picture.get(key(fleet));
      if (logo && SAFE_IMAGE.test(logo)) {
        return `.${fleetClass(fleet)}{--fleet-tag:"";--fleet-bg:#fff url("${logo}") center/contain no-repeat;--fleet-fg:${fg};--fleet-w:24px;--fleet-h:15px;--fleet-pad:0;--fleet-align:middle}`;
      }
      return `.${fleetClass(fleet)}{--fleet-tag:"${prefix}";--fleet-bg:${bg};--fleet-fg:${fg}}`;
    })
    .join("\n");
}
