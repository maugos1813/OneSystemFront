import { List } from "lucide-react";
import { useMemo, useState } from "react";
import { MapView } from "../components/MapView";
import { VehicleDetailPanel } from "../components/VehicleDetailPanel";
import { VehicleList } from "../components/VehicleList";
import { useFleet } from "../context/FleetContext";
import { useDeviceEvents } from "../hooks/useDeviceEvents";
import { usePositionHistory } from "../hooks/usePositionHistory";
import { useT } from "../i18n";
import { trackGlow } from "../lib/glow";

/** Below `lg` there isn't room for the vehicle list next to the map, so it starts collapsed there. */
function prefersOpenByDefault(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

export function DashboardPage() {
  const t = useT();
  const { filteredVehicles: vehicles, devices, positions, loading, error, sharedVehicles } = useFleet();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [historyRangeHours, setHistoryRangeHours] = useState<number | null>(null);
  const [listOpen, setListOpen] = useState(prefersOpenByDefault);

  const historyFrom = useMemo(() => {
    if (historyRangeHours === null) return null;
    return new Date(Date.now() - historyRangeHours * 60 * 60 * 1000);
  }, [historyRangeHours]);

  const { history } = usePositionHistory(selectedVehicleId, historyFrom);
  const { events } = useDeviceEvents(selectedVehicleId);

  // A vehicle shows on the map only once it has a device; until then the client waits for their admin to assign one.
  const hasTrackedVehicle = vehicles.some((v) => v.deviceId);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  function selectVehicle(vehicleId: string) {
    setSelectedVehicleId(vehicleId);
    setHistoryRangeHours(null);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">{t("common.loading")}</div>
    );
  }

  if (error) {
    return <div className="flex h-full items-center justify-center text-red-600 dark:text-red-400">{error}</div>;
  }

  return (
    <div className="relative flex h-full overflow-hidden">
      <VehicleList
        vehicles={vehicles}
        devices={devices}
        selectedVehicleId={selectedVehicleId}
        onSelect={selectVehicle}
        open={listOpen}
        onClose={() => setListOpen(false)}
      />
      <div className="relative flex-1">
        <MapView
          vehicles={vehicles}
          positions={positions}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={selectVehicle}
          historyPath={history}
          sharedVehicles={sharedVehicles}
        />

        {!hasTrackedVehicle && sharedVehicles.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
            <div className="float-card max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl shadow-slate-300/40 dark:bg-[#111729] dark:shadow-black/40">
              <p className="text-base font-semibold text-slate-900 dark:text-white">{t("map.noDevicesTitle")}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {vehicles.length === 0
                  ? t("map.noVehiclesYet")
                  : t("map.noDevicesYet")}
              </p>
            </div>
          </div>
        )}

        {!listOpen && (
          <button
            onClick={() => setListOpen(true)}
            onMouseMove={trackGlow}
            className="glow float-card absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-lg shadow-slate-300/40 dark:bg-[#111729] dark:text-slate-200 dark:shadow-black/40"
          >
            <List className="h-4 w-4" />
            {t("map.vehiclesCount", { count: vehicles.length })}
          </button>
        )}

        {selectedVehicle && (
          <VehicleDetailPanel
            vehicle={selectedVehicle}
            position={positions[selectedVehicle.id] ?? null}
            events={events}
            history={history}
            historyRangeHours={historyRangeHours}
            onHistoryRangeChange={setHistoryRangeHours}
            onClose={() => {
              setSelectedVehicleId(null);
              setHistoryRangeHours(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
