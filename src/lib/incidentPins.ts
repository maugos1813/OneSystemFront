import { INCIDENT_COLORS, type IncidentType } from "./drivingBehavior";

/** White glyphs on a 24x24 grid, one per kind of event: down arrow onto a bar (braking), up arrow off a bar (acceleration),
 * a turning arrow (cornering) and a speedometer (speeding). */
const GLYPHS: Record<IncidentType, string> = {
  harshBraking: '<path d="M12 4v11M7 11l5 5 5-5M6 20h12"/>',
  harshAcceleration: '<path d="M12 20V9M7 13l5-5 5 5M6 4h12"/>',
  harshCornering: '<path d="M8 20v-7a5 5 0 0 1 5-5h6M15 4l4 4-4 4"/>',
  speeding: '<path d="M4 17A8 8 0 0 1 20 17M12 17l4-6"/><circle cx="12" cy="17" r="1.2" fill="#fff"/>',
};

export const PIN_WIDTH = 40;
export const PIN_HEIGHT = 52;
/** The drawing is laid out on this grid and scaled to the size above. */
const GRID_WIDTH = 34;
const GRID_HEIGHT = 44;

/** A map pin (a drop, point down) in the colour of the event, with its glyph inside, as an image URL for a map marker. */
export function incidentPinUrl(type: IncidentType): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 ${GRID_WIDTH} ${GRID_HEIGHT}">` +
    `<path d="M17 42.5C17 42.5 2.5 27.5 2.5 17a14.5 14.5 0 0 1 29 0C31.5 27.5 17 42.5 17 42.5z" fill="${INCIDENT_COLORS[type]}" stroke="#fff" stroke-width="2"/>` +
    `<g transform="translate(17 17) scale(0.74) translate(-12 -12)" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[type]}</g>` +
    `</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
