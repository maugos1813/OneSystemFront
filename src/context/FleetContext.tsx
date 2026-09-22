import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAllPositions } from "../hooks/useAllPositions";
import { listDevices, listVehicles } from "../lib/api";
import type { Device, Position, Vehicle } from "../lib/types";

interface FleetContextValue {
  vehicles: Vehicle[];
  devices: Device[];
  positions: Record<string, Position>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const FleetContext = createContext<FleetContextValue | null>(null);

/** Loads vehicles + devices once, and polls every vehicle's latest position — shared
 * by the whole app (sidebar, map, alerts bell) so they don't each fetch independently. */
export function FleetProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

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

  const positions = useAllPositions(vehicles);
  const refetch = useCallback(() => setRefetchToken((t) => t + 1), []);

  return (
    <FleetContext.Provider value={{ vehicles, devices, positions, loading, error, refetch }}>
      {children}
    </FleetContext.Provider>
  );
}

export function useFleet(): FleetContextValue {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error("useFleet must be used within FleetProvider");
  return ctx;
}
