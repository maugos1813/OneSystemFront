import type { Geofence, Position } from "./types";

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Sums the distance between consecutive positions (assumed ordered oldest -> newest). */
export function computeTripDistanceKm(positions: Position[]): number {
  let total = 0;
  for (let i = 1; i < positions.length; i++) {
    total += haversineKm(positions[i - 1]!, positions[i]!);
  }
  return Math.round(total * 10) / 10;
}

const MIN_STOP_MS = 3 * 60 * 1000;

/** Counts separate trips — a new trip starts whenever movement resumes after being
 * stopped for at least MIN_STOP_MS, so brief stops (a red light) don't fragment one trip
 * into several. `positions` must be ordered oldest -> newest. */
export function computeTripCount(positions: Position[]): number {
  let trips = 0;
  let inTrip = false;
  let lastMovingIdx = -1;

  for (let i = 0; i < positions.length; i++) {
    const moving = positions[i]!.speed > 0;
    if (moving) {
      if (!inTrip) {
        const gapMs =
          lastMovingIdx === -1
            ? Infinity
            : new Date(positions[i]!.ts).getTime() - new Date(positions[lastMovingIdx]!.ts).getTime();
        if (gapMs >= MIN_STOP_MS) trips++;
        inTrip = true;
      }
      lastMovingIdx = i;
    } else {
      inTrip = false;
    }
  }

  return trips;
}

/** Wall-clock time spanned by the range, e.g. "3h 12m" or "45m". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

/** Milan's official traffic-restricted zones get their own colors (Area C — the paid,
 * fine-relevant congestion zone — in red; Area B, the broader low-emission zone, in
 * amber); any other geofence falls back to the app's usual brand violet. */
export function geofenceZoneColor(name: string): { stroke: string; fill: string } {
  if (name === "Area C") return { stroke: "#dc2626", fill: "#dc2626" };
  if (name === "Area B") return { stroke: "#f59e0b", fill: "#f59e0b" };
  return { stroke: "#7c3aed", fill: "#7c3aed" };
}

/** Even-odd (ray-casting) point-in-ring test — lng as x, lat as y. */
function pointInRing(point: { lat: number; lng: number }, ring: { lat: number; lng: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]!.lng;
    const yi = ring[i]!.lat;
    const xj = ring[j]!.lng;
    const yj = ring[j]!.lat;
    const intersect = yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Handles both shapes. For a polygon, XORing the even-odd result across every ring
 * correctly covers both a hole (an oppositely-wound nested ring) and disjoint separate
 * areas (like Area B's few exclaves) with the same rule.
 */
export function isInsideGeofence(position: { lat: number; lng: number }, geofence: Geofence): boolean {
  if (geofence.type === "polygon") {
    if (!geofence.path) return false;
    let inside = false;
    for (const ring of geofence.path) if (pointInRing(position, ring)) inside = !inside;
    return inside;
  }
  if (geofence.lat == null || geofence.lng == null || geofence.radiusMeters == null) return false;
  return haversineKm(position, { lat: geofence.lat, lng: geofence.lng }) * 1000 <= geofence.radiusMeters;
}
