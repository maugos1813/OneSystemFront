/**
 * The vector Map ID the 3D maps (the live map, the route history and the Cockpit) need for tilt and rotation. "DEMO_MAP_ID" is Google's id for
 * development; set VITE_GOOGLE_MAPS_MAP_ID to a vector Map ID of your own for production.
 */
export const MAP_ID: string = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

/** How far the "PRO" 3D view tilts the map: enough for a horizon and buildings standing up, not so much that the far side is lost. */
export const PRO_TILT = 45;

const THREE_D_KEY = "onesystem.map.3d";

/** Whether the person wants the maps in 3D (they open tilted): yes until they switch it off. */
export function prefersThreeD(): boolean {
  try {
    return localStorage.getItem(THREE_D_KEY) !== "0";
  } catch {
    return true;
  }
}

export function rememberThreeD(on: boolean): void {
  try {
    localStorage.setItem(THREE_D_KEY, on ? "1" : "0");
  } catch {
    /* not remembered: the next map just opens in 3D */
  }
}

const running = new WeakMap<google.maps.Map, number>();

/**
 * Glides the camera to a new tilt, heading or zoom instead of jumping, like a navigation app does (ease in and out, the short way
 * round for the heading). A new glide on the same map replaces the one under way.
 */
export function animateCamera(
  map: google.maps.Map,
  to: { tilt?: number; heading?: number; zoom?: number },
  durationMs = 650,
): void {
  const previous = running.get(map);
  if (previous) cancelAnimationFrame(previous);
  const from = { tilt: map.getTilt() ?? 0, heading: map.getHeading() ?? 0, zoom: map.getZoom() ?? 10 };
  const turn = to.heading === undefined ? 0 : ((to.heading - from.heading + 540) % 360) - 180;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min((now - start) / durationMs, 1);
    const k = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    map.moveCamera({
      ...(to.tilt !== undefined && { tilt: from.tilt + (to.tilt - from.tilt) * k }),
      ...(to.heading !== undefined && { heading: (((from.heading + turn * k) % 360) + 360) % 360 }),
      ...(to.zoom !== undefined && { zoom: from.zoom + (to.zoom - from.zoom) * k }),
    });
    if (t < 1) running.set(map, requestAnimationFrame(step));
    else running.delete(map);
  };
  running.set(map, requestAnimationFrame(step));
}

/**
 * Frames `bounds` like map.fitBounds, but keeps the view as it was (a vector map's fitBounds lays it flat and points it north):
 * once the frame settles the camera glides back to the tilt and heading it had, so a 3D map stays 3D.
 */
export function fitBoundsKeepingView(map: google.maps.Map, bounds: google.maps.LatLngBounds, padding: number | google.maps.Padding): void {
  const tilt = map.getTilt() ?? 0;
  const heading = map.getHeading() ?? 0;
  map.fitBounds(bounds, padding);
  if (tilt < 1 && Math.abs(heading) < 1) return;
  google.maps.event.addListenerOnce(map, "idle", () => animateCamera(map, { tilt, heading }));
}
