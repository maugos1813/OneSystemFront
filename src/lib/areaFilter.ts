/** Client-contract área a vehicle can be tagged with (Vehicle.fleetGroup) — kept as a
 * fixed pair since that's what the Mapa view switcher and every other área filter in the
 * app offer. `null` means "todas" (no filter). */
export type AreaFilter = "DHL" | "UNIVEX" | null;

export const AREA_OPTIONS: Exclude<AreaFilter, null>[] = ["DHL", "UNIVEX"];

const AREA_FILTER_KEY = "onesystem.areaFilter";

export function getStoredAreaFilter(): AreaFilter {
  const stored = localStorage.getItem(AREA_FILTER_KEY);
  return stored === "DHL" || stored === "UNIVEX" ? stored : null;
}

export function setStoredAreaFilter(area: AreaFilter): void {
  if (area) localStorage.setItem(AREA_FILTER_KEY, area);
  else localStorage.removeItem(AREA_FILTER_KEY);
}
