import { useEffect, useState } from "react";
import { listVehicles } from "./api";
import { uniqueFleetGroups } from "./areaFilter";

let cached: Promise<string[]> | null = null;

/** The flotas in use, for screens that sit outside the fleet context (Equipo). Fetched once and shared. */
export function useFleetGroups(): string[] {
  const [groups, setGroups] = useState<string[]>([]);
  useEffect(() => {
    cached ??= listVehicles().then(uniqueFleetGroups).catch(() => []);
    let live = true;
    void cached.then((value) => live && setGroups(value));
    return () => {
      live = false;
    };
  }, []);
  return groups;
}
