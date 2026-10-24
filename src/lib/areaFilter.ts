/** A flota: the group a vehicle belongs to (Vehicle.fleetGroup) — "DHL", "UNIVEX", "PIAZZA"… The names are free; the
 * list on screen is whatever the organization's vehicles actually use. `null` means "todas" (no filter). */
export type AreaFilter = string | null;

const AREA_FILTER_KEY = "onesystem.areaFilter";

/** The distinct flotas of some vehicles, sorted. */
export function uniqueFleetGroups(vehicles: ReadonlyArray<{ fleetGroup: string | null }>): string[] {
  return [...new Set(vehicles.map((v) => v.fleetGroup).filter((g): g is string => !!g))].sort((a, b) => a.localeCompare(b));
}

export function getStoredAreaFilter(): AreaFilter {
  try {
    return localStorage.getItem(AREA_FILTER_KEY) || null;
  } catch {
    return null;
  }
}

export function setStoredAreaFilter(area: AreaFilter): void {
  try {
    if (area) localStorage.setItem(AREA_FILTER_KEY, area);
    else localStorage.removeItem(AREA_FILTER_KEY);
  } catch {
    // Private mode or blocked storage: the filter just isn't remembered.
  }
}
