/** The camera behind the vehicle shared by the Cockpit and the route history: tilted, turned to where it heads, and
 * looking ahead of it so the road in front fills the screen. */

export const TILT = 65;
/** How far below the middle of the screen the vehicle sits, in pixels (the camera looks ahead of it by this much). */
export const AHEAD_PX = 150;
/** Below this the GPS heading is noise, so the last real one is kept. */
export const MIN_HEADING_SPEED_KMH = 3;

export const norm = (deg: number): number => ((deg % 360) + 360) % 360;

/** Signed shortest turn from one heading to another, e.g. 350° -> 10° is +20°. */
export const shortestTurn = (from: number, to: number): number => ((to - from + 540) % 360) - 180;

/** Closer at city speeds, wider on the motorway so there is room to see what comes. */
export function zoomForSpeed(speedKmh: number): number {
  const t = Math.min(Math.max((speedKmh - 20) / 70, 0), 1);
  return 18.2 - t * 1.6;
}

export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

export function pointAhead(lat: number, lng: number, headingDeg: number, meters: number): google.maps.LatLngLiteral {
  const h = (headingDeg * Math.PI) / 180;
  return {
    lat: lat + (meters * Math.cos(h)) / 111_320,
    lng: lng + (meters * Math.sin(h)) / (111_320 * Math.cos((lat * Math.PI) / 180)),
  };
}
