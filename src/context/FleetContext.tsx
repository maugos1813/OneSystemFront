import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useAllPositions } from "../hooks/useAllPositions";
import { useDriverVehicles } from "../hooks/useDriverVehicles";
import { useLiveAlerts } from "../hooks/useLiveAlerts";
import { useTagliandoNotices } from "../hooks/useTagliandoNotices";
import { getPlatformFleet, getSettings, listDevices, listFleetPictures, listGeofences, listVehicles } from "../lib/api";
import type { Alert } from "../lib/alerts";
import { getStoredAreaFilter, setStoredAreaFilter, uniqueFleetGroups, type AreaFilter } from "../lib/areaFilter";
import type { Device, Geofence, OrgSettings, Position, SharedVehicle, Vehicle } from "../lib/types";

interface FleetContextValue {
  /** The complete fleet, regardless of the área filter — positions/alerts always poll
   * every vehicle in the background, whether or not it's currently being displayed. */
  vehicles: Vehicle[];
  /** `vehicles` narrowed to the selected área (DHL/UNIVEX), or the same array when the
   * filter is "all" — what every page should actually render. */
  filteredVehicles: Vehicle[];
  selectedArea: AreaFilter;
  /** The flotas the visible vehicles belong to. */
  fleetGroups: string[];
  setSelectedArea: (area: AreaFilter) => void;
  devices: Device[];
  /** The picture of each fleet by name (OneSystec's map: each client's logo by its name): what opens the plates on the map. */
  fleetLogos: Record<string, string>;
  positions: Record<string, Position>;
  settings: OrgSettings | null;
  geofences: Geofence[];
  alerts: Alert[];
  /** Gamonal vehicles Gamonal Driver lets a client see on the map (read-only, not part of their fleet). */
  sharedVehicles: SharedVehicle[];
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
  const [fleetLogos, setFleetLogos] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);
  const [settingsToken, setSettingsToken] = useState(0);
  const [geofencesToken, setGeofencesToken] = useState(0);
  const [selectedArea, setSelectedAreaState] = useState<AreaFilter>(getStoredAreaFilter);

  // OneSystec (not looking at one client) sees every device of every client: that is how it follows what it hands out.
  const allClients = currentUser?.isPlatform === true && !currentUser.viewingAs;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (allClients
      ? getPlatformFleet().then((fleet) => [fleet.vehicles, fleet.devices, fleet.logos] as const)
      : Promise.all([
          listVehicles(),
          listDevices(),
          // The pictures are only a nicety for the plates: if they cannot be read the map still works, with letters.
          listFleetPictures()
            .then((pictures) => Object.fromEntries(pictures.filter((f) => f.tag).map((f) => [f.name, f.tag as string])))
            .catch((): Record<string, string> => ({})),
        ])
    )
      .then(([v, d, logos]) => {
        if (cancelled) return;
        setVehicles(v);
        setDevices(d);
        setFleetLogos(logos);
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
  }, [refetchToken, allClients]);

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

  const allClientsSnapshot = useMemo(
    () => (allClients ? { snapshot: async () => (await getPlatformFleet()).positions } : undefined),
    [allClients],
  );
  const positions = useAllPositions(vehicles, allClientsSnapshot);
  // Only a client with a flota and the map: the organization's own people already see the whole fleet.
  const sharedVehicles = useDriverVehicles(!!currentUser?.allowedArea && !!currentUser.modules.includes("mapa"));
  const liveAlerts = useLiveAlerts(vehicles, devices, positions, settings, geofences);
  // An account that only sees the vehicles and their tagliando (Recursos humanos) is told only about those: the tagliando
  // close to its 20 000 km, and the vehicles that lack what the count needs. Everyone else keeps the usual alerts.
  const tagliandoOnly =
    !!currentUser &&
    currentUser.role !== "owner" &&
    currentUser.role !== "admin" &&
    currentUser.modules.includes("mantenimiento") &&
    currentUser.modules.every((module) => module === "vehiculos" || module === "mantenimiento");
  const tagliandoNotices = useTagliandoNotices(vehicles, tagliandoOnly);
  // Each client's alerts use that client's own thresholds: OneSystec reads them inside the client's account ("Ver mapa").
  const alerts = allClients ? [] : tagliandoOnly ? tagliandoNotices : liveAlerts;
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
  const fleetGroups = useMemo(() => uniqueFleetGroups(vehicles), [vehicles]);
  // A remembered filter for a flota that no longer exists must not hide everything.
  const effectiveArea = currentUser?.allowedArea ?? (selectedArea && fleetGroups.includes(selectedArea) ? selectedArea : null);
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
        fleetGroups,
        setSelectedArea,
        devices,
        fleetLogos,
        positions,
        settings,
        geofences,
        alerts,
        sharedVehicles,
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
