import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useAllPositions } from "../hooks/useAllPositions";
import { useLiveAlerts } from "../hooks/useLiveAlerts";
import { getSettings, listDevices, listGeofences, listVehicles } from "../lib/api";
import type { Alert } from "../lib/alerts";
import { getStoredAreaFilter, setStoredAreaFilter, type AreaFilter } from "../lib/areaFilter";
import type { Device, Geofence, OrgSettings, Position, Vehicle } from "../lib/types";

interface FleetContextValue {
  /** The complete fleet, regardless of the área filter — positions/alerts always poll
   * every vehicle in the background, whether or not it's currently being displayed. */
  vehicles: Vehicle[];
  /** `vehicles` narrowed to the selected área (DHL/UNIVEX), or the same array when the
   * filter is "all" — what every page should actually render. */
  filteredVehicles: Vehicle[];
  selectedArea: AreaFilter;
  setSelectedArea: (area: AreaFilter) => void;
  devices: Device[];
  positions: Record<string, Position>;
  settings: OrgSettings | null;
  geofences: Geofence[];
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  refetchSettings: () => void;
  refetchGeofences: () => void;
}

const FleetContext = createContext<FleetContextValue | null>(null);

/** Loads vehicles + devices + org settings + geofences once, and polls every vehicle's
 * latest position — shared by the whole app (sidebar, map, alerts bell) so they don't
 * each fetch independently. Also computes the live alert list from all of the above. */
export function FleetProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);
  const [settingsToken, setSettingsToken] = useState(0);
  const [geofencesToken, setGeofencesToken] = useState(0);
  const [selectedArea, setSelectedAreaState] = useState<AreaFilter>(getStoredAreaFilter);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([listVehicles(), listDevices()])
      .then(([v, d]) => {
        if (cancelled) return;
        setVehicles(v);
        setDevices(d);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudieron cargar los datos de la flota");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refetchToken]);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch(() => {
        /* alerts just stay off until settings load — no fleet-wide error for this */
      });
    return () => {
      cancelled = true;
    };
  }, [settingsToken]);

  useEffect(() => {
    let cancelled = false;
    listGeofences()
      .then((g) => {
        if (!cancelled) setGeofences(g);
      })
      .catch(() => {
        /* geofence alerts just stay empty until this loads */
      });
    return () => {
      cancelled = true;
    };
  }, [geofencesToken]);

  const positions = useAllPositions(vehicles);
  const alerts = useLiveAlerts(vehicles, devices, positions, settings, geofences);
  const refetch = useCallback(() => setRefetchToken((t) => t + 1), []);
  const refetchSettings = useCallback(() => setSettingsToken((t) => t + 1), []);
  const refetchGeofences = useCallback(() => setGeofencesToken((t) => t + 1), []);
  const setSelectedArea = useCallback((area: AreaFilter) => {
    setStoredAreaFilter(area);
    setSelectedAreaState(area);
  }, []);
  // A hard-restricted user's `vehicles` already only contains their allowed área
  // (server-enforced) — their personal filter preference is forced to match so it can
  // never accidentally double-filter that down to nothing.
  const effectiveArea = (currentUser?.allowedArea as AreaFilter | undefined) ?? selectedArea;
  const filteredVehicles = useMemo(
    () => (effectiveArea ? vehicles.filter((v) => v.fleetGroup === effectiveArea) : vehicles),
    [vehicles, effectiveArea],
  );

  return (
    <FleetContext.Provider
      value={{
        vehicles,
        filteredVehicles,
        selectedArea: effectiveArea,
        setSelectedArea,
        devices,
        positions,
        settings,
        geofences,
        alerts,
        loading,
        error,
        refetch,
        refetchSettings,
        refetchGeofences,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
}

export function useFleet(): FleetContextValue {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error("useFleet must be used within FleetProvider");
  return ctx;
}
