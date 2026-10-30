import { List } from "lucide-react";
import { useMemo, useState } from "react";
import { MapView } from "../components/MapView";
import { VehicleDetailPanel } from "../components/VehicleDetailPanel";
import { SharedVehiclePanel } from "../components/SharedVehiclePanel";
import { VehicleList } from "../components/VehicleList";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { usePositionHistory } from "../hooks/usePositionHistory";
import { useT } from "../i18n";
import { trackGlow } from "../lib/glow";
import { normalizePlate } from "../lib/plate";

/** Below `lg` there isn't room for the vehicle list next to the map, so it starts collapsed there. */
function prefersOpenByDefault(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

/** Which vehicles the map draws: everything, only the Gamonal ones shared through the Driver, or only the client's own flota. */
type MapSource = "all" | "gamonal" | "own";

export function DashboardPage() {
  const t = useT();
  const { currentUser } = useAuth();
  const [source, setSource] = useState<MapSource>("all");
  const { filteredVehicles: vehicles, devices, positions, loading, error, sharedVehicles } = useFleet();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedSharedPlate, setSelectedSharedPlate] = useState<string | null>(null);
  const [historyRangeHours, setHistoryRangeHours] = useState<number | null>(null);
  const [listOpen, setListOpen] = useState(prefersOpenByDefault);

  const historyFrom = useMemo(() => {
    if (historyRangeHours === null) return null;
    return new Date(Date.now() - historyRangeHours * 60 * 60 * 1000);
  }, [historyRangeHours]);

  const { history } = usePositionHistory(selectedVehicleId, historyFrom);

  // A vehicle shows on the map only once it has a device; until then the client waits for their admin to assign one.
  const hasTrackedVehicle = vehicles.some((v) => v.deviceId);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  // What the pills ask for. A Gamonal vehicle the client also has of their own is shown once, as theirs.
  const showOwn = source !== "gamonal";
  const visibleShared = useMemo(() => {
    if (source === "own") return [];
    const ownPlates = new Set(vehicles.map((v) => normalizePlate(v.plate)));
    return sharedVehicles.filter((v) => !(showOwn && ownPlates.has(v.plate)));
  }, [source, showOwn, vehicles, sharedVehicles]);
  const selectedShared = visibleShared.find((v) => v.plate === selectedSharedPlate) ?? null;

  function selectVehicle(vehicleId: string) {
    setSelectedVehicleId(vehicleId);
    setSelectedSharedPlate(null);
    setHistoryRangeHours(null);
  }

  function selectShared(plate: string) {
    setSelectedSharedPlate(plate);
    setSelectedVehicleId(null);
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
        vehicles={showOwn ? vehicles : []}
        devices={devices}
        selectedVehicleId={selectedVehicleId}
        onSelect={selectVehicle}
        open={listOpen}
        onClose={() => setListOpen(false)}
        sharedVehicles={visibleShared}
        selectedSharedPlate={selectedSharedPlate}
        onSelectShared={selectShared}
      />
      <div className="relative flex-1">
        <MapView
          vehicles={vehicles}
          positions={positions}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={selectVehicle}
          historyPath={history}
          sharedVehicles={visibleShared}
          selectedSharedPlate={selectedSharedPlate}
          onSelectShared={selectShared}
          showOwn={showOwn}
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

        {/* Top-left, clear of Google's full-screen button on the right. */}
        <div className="pointer-events-none absolute top-2 right-16 left-2 z-10 flex flex-wrap items-center gap-2">
          {!listOpen && (
            <button
              onClick={() => setListOpen(true)}
              onMouseMove={trackGlow}
              className="glow float-card pointer-events-auto flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-lg shadow-slate-300/40 dark:bg-[#111729] dark:text-slate-200 dark:shadow-black/40"
            >
              <List className="h-4 w-4" />
              {t("map.vehiclesCount", { count: (showOwn ? vehicles.length : 0) + visibleShared.length })}
            </button>
          )}

          {/* Only for a client who also sees Gamonal's vehicles: all of them, Gamonal's, or their own flota. */}
          {sharedVehicles.length > 0 && (
            <div role="group" aria-label={t("map.filterLabel")} className="pointer-events-auto flex gap-1.5">
              {(
                [
                  ["all", t("map.filterAll")],
                  ["gamonal", t("map.filterGamonal")],
                  ["own", currentUser?.allowedArea ?? t("common.fleet")],
                ] as Array<[MapSource, string]>
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={source === value}
                  onClick={() => setSource(value)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold tracking-wide uppercase shadow-lg shadow-slate-300/40 transition dark:shadow-black/40 ${
                    source === value ? "brand-button" : "bg-white text-slate-600 dark:bg-[#111729] dark:text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedShared && <SharedVehiclePanel vehicle={selectedShared} onClose={() => setSelectedSharedPlate(null)} />}

        {selectedVehicle && (
          <VehicleDetailPanel
            vehicle={selectedVehicle}
            position={positions[selectedVehicle.id] ?? null}
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
