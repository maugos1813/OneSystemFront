import { isOffline } from "./alerts";
import { AVL_ID, type Position } from "./types";

/** What a vehicle is doing right now, as the list and its filters tell it. */
export type VehicleStatus = "moving" | "stopped" | "offline";

/** Moving (the arrow on the map), stopped (engine on or off, not moving), or no signal (the tracker has gone quiet). */
export function vehicleStatus(position: Position | undefined, lastSeenAt: string | null): VehicleStatus {
  if (!position || isOffline(lastSeenAt)) return "offline";
  return position.speed > 0 ? "moving" : "stopped";
}

/** Whether the engine is on while stopped (an idling vehicle, the orange dot). */
export function isIdling(position: Position | undefined): boolean {
  const ignition = position?.ioData[AVL_ID.IGNITION];
  return !!position && !(position.speed > 0) && (ignition === 1 || ignition === "1");
}

/** A search term and a text compared without case, spaces, dots or dashes: "ab 123 cd", "AB-123-CD" and "ab123cd" are the same plate. */
export const squash = (text: string | null | undefined): string => (text ?? "").toLowerCase().replace(/[\s.\-_]/g, "");

export function matchesSearch(query: string, ...fields: Array<string | null | undefined>): boolean {
  const needle = squash(query);
  return needle === "" || fields.some((field) => squash(field).includes(needle));
}
