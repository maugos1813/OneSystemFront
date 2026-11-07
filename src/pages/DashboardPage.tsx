import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapFiltersButton, MapFiltersPanel } from "../components/MapFiltersPanel";
import { MapView } from "../components/MapView";
import { VehicleDetailPanel } from "../components/VehicleDetailPanel";
import { SharedVehiclePanel } from "../components/SharedVehiclePanel";
import { VehicleList } from "../components/VehicleList";
import { useAuth } from "../context/AuthContext";
import { useBackToClose } from "../hooks/useBackToClose";
import { useInAppFullscreen } from "../hooks/useInAppFullscreen";
import { useFleet } from "../context/FleetContext";
import { useT } from "../i18n";
import { normalizePlate } from "../lib/plate";
import type { VehicleEta } from "../lib/types";
import { thresholdsFromSettings, vehicleStatus, type VehicleStatus } from "../lib/vehicleStatus";

/** Which vehicles the map draws: everything, only the Gamonal ones shared through the Driver, or only the client's own flota. */
type MapSource = "all" | "gamonal" | "own";

export function DashboardPage() {
  const t = useT();
  const { currentUser } = useAuth();
  const [source, setSource] = useState<MapSource>("all");
  const { filteredVehicles: allVehicles, devices, positions, loading, error, sharedVehicles, selectedArea, setSelectedArea, settings } = useFleet();
  // OneSystec's all-clients map lists devices too, many with no plate yet (named by their IMEI, which takes a lot of room): they
  // stay out of the map until asked for.
  const allClients = currentUser?.isPlatform === true && !currentUser.viewingAs;
  const [showNoPlate, setShowNoPlate] = useState(false);
  const noPlateCount = allVehicles.filter((v) => !v.plate).length;
  const vehicles = useMemo(
    () => (allClients && !showNoPlate ? allVehicles.filter((v) => !!v.plate) : allVehicles),
    [allClients, showNoPlate, allVehicles],
  );
  // The start links here with a state already chosen (e.g. the ones with no signal): /gps?estado=offline.
  const [params] = useSearchParams();
  const wanted = params.get("estado");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | null>(wanted === "moving" || wanted === "stopped" || wanted === "offline" ? wanted : null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapFull, toggleMapFull] = useInAppFullscreen();
  // Back closes the filters panel too.
  useBackToClose(filtersOpen, () => setFiltersOpen(false));
  // Bumped by "Ver toda la flota": the map frames every vehicle each time it changes.
  const [fitSignal, setFitSignal] = useState(0);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedSharedPlate, setSelectedSharedPlate] = useState<string | null>(null);
  // The road ahead of the selected vehicle to a destination searched in its panel, drawn on the map.
  const [route, setRoute] = useState<VehicleEta | null>(null);

  // A vehicle shows on the map only once it has a device; until then the client waits for their admin to assign one.
  const hasTrackedVehicle = vehicles.some((v) => v.deviceId);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  // What each state has, counted over the flota in view; and the vehicles that the state filter leaves on the map and in the list.
  const deviceSeen = useMemo(() => new Map(devices.map((d) => [d.id, d.lastSeenAt])), [devices]);
  const stateOf = (v: (typeof vehicles)[number]): VehicleStatus =>
    vehicleStatus(positions[v.id], v.deviceId ? (deviceSeen.get(v.deviceId) ?? null) : null, thresholdsFromSettings(settings));
  const counts = { all: vehicles.length, moving: 0, stopped: 0, offline: 0 };
  for (const v of vehicles) counts[stateOf(v)] += 1;
  const shownVehicles = statusFilter ? vehicles.filter((v) => stateOf(v) === statusFilter) : vehicles;

  // What the pills ask for. A Gamonal vehicle the client also has of their own is shown once, as theirs.
  const showOwn = source !== "gamonal";
  const visibleShared = useMemo(() => {
    // A Gamonal vehicle has no state of its own here, so a state filter leaves them out.
    if (source === "own" || statusFilter) return [];
    const ownPlates = new Set(vehicles.map((v) => normalizePlate(v.plate)));
    return sharedVehicles.filter((v) => !(showOwn && ownPlates.has(v.plate)));
  }, [source, statusFilter, showOwn, vehicles, sharedVehicles]);
  const selectedShared = visibleShared.find((v) => v.plate === selectedSharedPlate) ?? null;

  const activeFilters = (statusFilter ? 1 : 0) + (source !== "all" ? 1 : 0) + (selectedArea ? 1 : 0);
  const shownCount = (showOwn ? shownVehicles.length : 0) + visibleShared.length;

  function clearFilters() {
    setStatusFilter(null);
    setSource("all");
    setSelectedArea(null);
    setShowNoPlate(false);
  }

  function selectVehicle(vehicleId: string) {
    setSelectedVehicleId(vehicleId);
    setSelectedSharedPlate(null);
  }

  function selectShared(plate: string) {
    setSelectedSharedPlate(plate);
    setSelectedVehicleId(null);
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
    // `isolate`: everything over the map (search, filters, panels) stays beneath the app's own bars and the bell's list.
    <div className={mapFull ? "fixed inset-0 z-[60] isolate flex overflow-hidden bg-[#f5f6fb] dark:bg-[#0a0e1a]" : "relative isolate flex h-full overflow-hidden"}>
      <div className="relative flex-1">
        <MapView
          vehicles={shownVehicles}
          fitSignal={fitSignal}
          fullscreen={mapFull}
          onToggleFullscreen={toggleMapFull}
          positions={positions}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={selectVehicle}
          sharedVehicles={visibleShared}
          selectedSharedPlate={selectedSharedPlate}
          onSelectShared={selectShared}
          showOwn={showOwn}
          route={route}
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

        {/* Only the search sits over the map, with the button of the filters beside it; the list opens under the search when asked for. */}
        <VehicleList
          vehicles={showOwn ? shownVehicles : []}
          devices={devices}
          positions={positions}
          selectedVehicleId={selectedVehicleId}
          onSelect={selectVehicle}
          sharedVehicles={visibleShared}
          selectedSharedPlate={selectedSharedPlate}
          onSelectShared={selectShared}
          trailing={<MapFiltersButton onClick={() => setFiltersOpen(true)} active={activeFilters} />}
        />

        <MapFiltersPanel
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          statusFilter={statusFilter}
          onStatusFilter={(status) => setStatusFilter(statusFilter === status ? null : status)}
          counts={counts}
          sourcePills={
            // Only for a client who also sees Gamonal's vehicles: all of them, Gamonal's, or their own flota.
            sharedVehicles.length > 0 ? (
              <div role="group" aria-label={t("map.filterLabel")} className="flex flex-wrap gap-2">
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
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      source === value
                        ? "brand-button"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : undefined
          }
          noPlate={allClients && noPlateCount > 0 ? { count: noPlateCount, shown: showNoPlate, onChange: setShowNoPlate } : undefined}
          onFitFleet={() => setFitSignal((n) => n + 1)}
          shownCount={shownCount}
          activeFilters={activeFilters}
          onClear={clearFilters}
        />

        {selectedShared && <SharedVehiclePanel vehicle={selectedShared} onClose={() => setSelectedSharedPlate(null)} />}

        {selectedVehicle && (
          <VehicleDetailPanel
            vehicle={selectedVehicle}
            position={positions[selectedVehicle.id] ?? null}
            onClose={() => setSelectedVehicleId(null)}
            onRoute={setRoute}
          />
        )}
      </div>
    </div>
  );
}
