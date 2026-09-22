import type { Position } from "./types";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
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
