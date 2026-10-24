import { PanelLeftClose, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useT } from "../i18n";
import { trackGlow } from "../lib/glow";
import type { Device, Vehicle } from "../lib/types";
import { StatusBadge } from "./StatusBadge";
import type { SharedVehicle } from "../lib/types";

interface VehicleListProps {
  vehicles: Vehicle[];
  devices: Device[];
  selectedVehicleId: string | null;
  onSelect: (vehicleId: string) => void;
  /** Below `lg` there's no room for the list next to the map, so it's an off-canvas drawer there. */
  open: boolean;
  onClose: () => void;
  /** Gamonal vehicles the client also sees on the map (already narrowed by the map's pills), listed after their own. */
  sharedVehicles?: SharedVehicle[];
  selectedSharedPlate?: string | null;
  onSelectShared?: (plate: string) => void;
}

function isOffCanvasSize(): boolean {
  return typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches;
}

export function VehicleList({
  vehicles,
  devices,
  selectedVehicleId,
  onSelect,
  open,
  onClose,
  sharedVehicles = [],
  selectedSharedPlate = null,
  onSelectShared,
}: VehicleListProps) {
  const t = useT();
  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const [search, setSearch] = useState("");

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return vehicles;
    return vehicles.filter(
      (v) => v.name.toLowerCase().includes(query) || (v.plate ?? "").toLowerCase().includes(query),
    );
  }, [vehicles, search]);

  const filteredShared = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? sharedVehicles.filter((v) => v.plate.toLowerCase().includes(query)) : sharedVehicles;
  }, [sharedVehicles, search]);

  return (
    <>
      {open && <div className="absolute inset-0 z-20 bg-slate-900/30 lg:hidden" onClick={onClose} />}

      <aside
        className={`absolute inset-y-0 left-0 z-30 max-w-[85vw] overflow-hidden border-r border-violet-100 bg-white transition-all duration-200 lg:static lg:z-auto dark:border-white/5 dark:bg-[#0d1220] ${
          open
            ? "w-80 translate-x-0 lg:w-72"
            : "w-80 -translate-x-full lg:w-0 lg:translate-x-0 lg:border-transparent"
        }`}
      >
        <div className="flex h-full w-80 flex-col lg:w-72">
          <div className="flex items-center justify-between border-b border-violet-100 px-4 py-3 dark:border-white/5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("vehicles.title")}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label={t("vehicles.hideList")}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-violet-100 px-3 py-2.5 dark:border-white/5">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("vehicles.search")}
                className="field-input w-full rounded-lg border border-slate-200 py-1.5 pr-3 pl-8 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
          </div>

          <div className="styled-scrollbar flex-1 overflow-y-auto">
            {filteredVehicles.length === 0 && filteredShared.length === 0 && (
              <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
                {vehicles.length === 0 && sharedVehicles.length === 0 ? t("vehicles.noneYet") : t("vehicles.noMatch")}
              </p>
            )}

            {filteredVehicles.map((vehicle) => {
              const device = vehicle.deviceId ? deviceById.get(vehicle.deviceId) : undefined;
              const selected = vehicle.id === selectedVehicleId;

              return (
                <button
                  key={vehicle.id}
                  onClick={() => {
                    onSelect(vehicle.id);
                    if (isOffCanvasSize()) onClose();
                  }}
                  onMouseMove={trackGlow}
                  className={`glow flex w-full items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 text-left transition dark:border-white/5 ${
                    selected ? "brand-gradient-soft dark:bg-blue-500/15" : "hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-medium text-slate-900 dark:text-white">{vehicle.name}</span>
                      {vehicle.fleetGroup && (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                          {vehicle.fleetGroup}
                        </span>
                      )}
                    </div>
                    {vehicle.plate && (
                      <span className="truncate text-xs text-slate-500 dark:text-slate-400">{vehicle.plate}</span>
                    )}
                  </div>
                  <div className="shrink-0">
                    <StatusBadge lastSeenAt={device?.lastSeenAt ?? null} />
                  </div>
                </button>
              );
            })}

            {filteredShared.map((vehicle) => {
              const moving = (vehicle.speed ?? 0) > 0;
              const dot = moving ? "bg-green-600" : vehicle.ignition ? "bg-orange-500" : "bg-red-600";
              const label = moving ? t("map.legendMoving") : vehicle.ignition ? t("map.legendIdle") : t("map.legendOff");
              return (
                <button
                  key={vehicle.plate}
                  onClick={() => {
                    onSelectShared?.(vehicle.plate);
                    if (isOffCanvasSize()) onClose();
                  }}
                  onMouseMove={trackGlow}
                  className={`glow flex w-full items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 text-left transition dark:border-white/5 ${
                    selectedSharedPlate === vehicle.plate ? "brand-gradient-soft dark:bg-blue-500/15" : "hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-medium text-slate-900 dark:text-white">{vehicle.plate}</span>
                      <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase dark:bg-white/10 dark:text-slate-300">
                        {t("map.filterGamonal")}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
