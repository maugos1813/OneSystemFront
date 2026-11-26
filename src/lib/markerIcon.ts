import { AVL_ID, type Position } from "./types";

/** The body colours of a vehicle's pin (top light, base, shade), by state. */
const PALETTE = {
  moving: ["#86efac", "#16a34a", "#14532d"], // green: on the move
  idle: ["#fdba74", "#f97316", "#9a3412"], // orange: engine on, standing
  off: ["#fca5a5", "#dc2626", "#7f1d1d"], // red: engine off
  unknown: ["#e2e8f0", "#94a3b8", "#475569"], // grey: no report yet
  track: ["#c4b5fd", "#7c3aed", "#4c1d95"], // violet: the vehicle replayed on its route
  trackOver: ["#fca5a5", "#dc2626", "#7f1d1d"], // red: replayed while over the speed limit
} as const;
type PinState = keyof typeof PALETTE;
type Glyph = "arrow" | "bars" | "dot";

const pinCache = new Map<string, string>();

/**
 * The "3D" pin of a vehicle, drawn as SVG: a glossy ball on a short stem standing on the ground with its shadow, white-rimmed, with
 * an arrow turned the way the vehicle goes while it moves (two bars when it stands with the engine on, a dot when it is off). A moving
 * vehicle sends out a ring along the ground, like a radar ping. The picture is the same whatever the map's tilt, so it reads as an
 * object standing on the map. Cached per state, 5° of heading and selection.
 */
function pinUrl(state: PinState, glyphKind: Glyph, ping: boolean, angle: number, selected: boolean, opacity: number): string {
  const key = `${state}|${glyphKind}|${ping}|${angle}|${selected}|${opacity}`;
  const cached = pinCache.get(key);
  if (cached) return cached;
  const [light, base, shade] = PALETTE[state];
  const glyph =
    glyphKind === "arrow"
      ? `<path d="M24 12.5 L31.5 31 L24 26.6 L16.5 31 Z" fill="#fff" transform="rotate(${angle} 24 24)"/>`
      : glyphKind === "bars"
        ? '<rect x="18.5" y="17" width="4" height="14" rx="1.4" fill="#fff"/><rect x="25.5" y="17" width="4" height="14" rx="1.4" fill="#fff"/>'
        : '<circle cx="24" cy="24" r="5" fill="#fff"/>';
  const pingRing = ping
      ? `<ellipse cx="24" cy="55" rx="6" ry="2" fill="none" stroke="${base}" stroke-width="2">` +
        '<animate attributeName="rx" values="6;21" dur="1.8s" repeatCount="indefinite"/>' +
        '<animate attributeName="ry" values="2;6.5" dur="1.8s" repeatCount="indefinite"/>' +
        '<animate attributeName="opacity" values="0.7;0" dur="1.8s" repeatCount="indefinite"/></ellipse>'
      : "";
  const halo = selected ? '<circle cx="24" cy="24" r="21" fill="none" stroke="#8b5cf6" stroke-width="3" opacity="0.9"/>' : "";
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">' +
    "<defs>" +
    `<radialGradient id="b" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="${light}"/><stop offset="0.55" stop-color="${base}"/><stop offset="1" stop-color="${shade}"/></radialGradient>` +
    `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${base}"/><stop offset="1" stop-color="${shade}"/></linearGradient>` +
    '<filter id="f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>' +
    "</defs>" +
    `<g opacity="${opacity}">` +
    '<ellipse cx="24" cy="55.5" rx="9" ry="2.8" fill="#0f172a" opacity="0.35" filter="url(#f)"/>' +
    pingRing +
    '<path d="M18.5 37 L24 55 L29.5 37 Z" fill="url(#s)"/>' +
    halo +
    '<circle cx="24" cy="24" r="16" fill="url(#b)" stroke="#fff" stroke-width="2.6"/>' +
    '<ellipse cx="19.5" cy="15.5" rx="8" ry="4.5" fill="#fff" opacity="0.38"/>' +
    glyph +
    "</g></svg>";
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  pinCache.set(key, url);
  return url;
}

/**
 * A vehicle's 3D pin (see pinUrl) for a legacy Marker: red, orange or green by state, the arrow turned to `position.angle` (already
 * corrected for the map's own heading by the caller). The plate label sits above the ball. `opacity` fades only the pin (vehicles not
 * selected), so the plate stays solid. Undefined until the Maps script is ready.
 */
export function getVehicleIcon(position: Position | undefined, opacity = 1, selected = false): google.maps.Icon | undefined {
  if (typeof google === "undefined" || !google.maps?.Size || !google.maps?.Point) return undefined;
  let state: PinState = "unknown";
  if (position) {
    const ignitionOn = position.ioData[AVL_ID.IGNITION] === 1 || position.ioData[AVL_ID.IGNITION] === "1";
    state = position.speed > 0 ? "moving" : ignitionOn ? "idle" : "off";
  }
  const angle = Math.round((position?.angle ?? 0) / 5) * 5;
  const glyph: Glyph = state === "moving" ? "arrow" : state === "idle" ? "bars" : "dot";
  return pinIcon(pinUrl(state, glyph, state === "moving", angle, selected, opacity), selected ? 0.95 : 0.8);
}

/** Size, ground anchor and label place of a pin picture drawn at `scale` (the SVG is 48 × 60). */
function pinIcon(url: string, scale: number): google.maps.Icon {
  return {
    url,
    scaledSize: new google.maps.Size(48 * scale, 60 * scale),
    // The pin stands on the vehicle's place: its tip on the ground.
    anchor: new google.maps.Point(24 * scale, 55 * scale),
    labelOrigin: new google.maps.Point(24 * scale, 2),
  };
}

/**
 * The vehicle replayed on its route in the history: the same 3D pin, violet (red while over the speed limit), its arrow turned to
 * `angle` (already corrected for the map's heading) and the ground ring while it moves.
 */
export function getPlaybackIcon(angle: number, moving: boolean, overLimit: boolean): google.maps.Icon | undefined {
  if (typeof google === "undefined" || !google.maps?.Size || !google.maps?.Point) return undefined;
  return pinIcon(pinUrl(overLimit ? "trackOver" : "track", "arrow", moving, Math.round(angle / 5) * 5, false, 1), 0.95);
}

/** Where the route starts (green, with a dot) and ends (dark, with a chequered flag), as small 3D pins. */
export function getRouteEndIcon(kind: "start" | "end"): google.maps.Icon | undefined {
  if (typeof google === "undefined" || !google.maps?.Size || !google.maps?.Point) return undefined;
  const [light, base, shade] = kind === "start" ? ["#6ee7b7", "#059669", "#064e3b"] : ["#94a3b8", "#334155", "#0f172a"];
  const mark =
    kind === "start"
      ? '<circle cx="24" cy="24" r="5.5" fill="#fff"/>'
      : '<g transform="translate(17 17)"><rect width="14" height="14" rx="1.5" fill="#fff"/>' +
        '<rect width="3.5" height="3.5" fill="#0f172a"/><rect x="7" width="3.5" height="3.5" fill="#0f172a"/>' +
        '<rect x="3.5" y="3.5" width="3.5" height="3.5" fill="#0f172a"/><rect x="10.5" y="3.5" width="3.5" height="3.5" fill="#0f172a"/>' +
        '<rect y="7" width="3.5" height="3.5" fill="#0f172a"/><rect x="7" y="7" width="3.5" height="3.5" fill="#0f172a"/>' +
        '<rect x="3.5" y="10.5" width="3.5" height="3.5" fill="#0f172a"/><rect x="10.5" y="10.5" width="3.5" height="3.5" fill="#0f172a"/></g>';
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">' +
    `<defs><radialGradient id="b" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="${light}"/><stop offset="0.55" stop-color="${base}"/><stop offset="1" stop-color="${shade}"/></radialGradient>` +
    '<filter id="f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter></defs>' +
    '<ellipse cx="24" cy="55.5" rx="9" ry="2.8" fill="#0f172a" opacity="0.35" filter="url(#f)"/>' +
    `<path d="M18.5 37 L24 55 L29.5 37 Z" fill="${shade}"/>` +
    '<circle cx="24" cy="24" r="16" fill="url(#b)" stroke="#fff" stroke-width="2.6"/>' +
    '<ellipse cx="19.5" cy="15.5" rx="8" ry="4.5" fill="#fff" opacity="0.38"/>' +
    mark +
    "</svg>";
  return pinIcon(`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, 0.7);
}

/**
 * The wrench over the plate of a vehicle that is broken down: a red disc with a white wrench, sitting above the plate tag and
 * centred on it (the tag is centred on the vehicle). Undefined until the Maps script is ready.
 */
export function getBrokenIcon(): google.maps.Icon | undefined {
  if (typeof google === "undefined" || !google.maps?.Size || !google.maps?.Point) return undefined;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">' +
    '<circle cx="12" cy="12" r="11.5" fill="#dc2626" stroke="#fff" stroke-width="1"/>' +
    '<g transform="translate(4.6 4.6) scale(0.62)" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' +
    "</g></svg>";
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(24, 24),
    // Above the vehicle's pin and its plate tag.
    anchor: new google.maps.Point(12, 78),
  };
}
