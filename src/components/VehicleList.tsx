import { List, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useT } from "../i18n";
import { trackGlow } from "../lib/glow";
import { formatRelativeTime } from "../lib/relativeTime";
import type { Device, Position, SharedVehicle, Vehicle } from "../lib/types";
import { isIdling, matchesSearch, vehicleStatus, type VehicleStatus } from "../lib/vehicleStatus";
import { StatusBadge } from "./StatusBadge";

interface VehicleListProps {
  vehicles: Vehicle[];
  devices: Device[];
  /** Each vehicle's latest position: what the rows say it is doing and what the filters count. */
  positions: Record<string, Position>;
  selectedVehicleId: string | null;
  onSelect: (vehicleId: string) => void;
  /** Gamonal vehicles the client also sees on the map (already narrowed by the map's pills), listed after their own. */
  sharedVehicles?: SharedVehicle[];
  selectedSharedPlate?: string | null;
  onSelectShared?: (plate: string) => void;
  /** What sits to the right of the search box (the button of the filters panel). */
  trailing?: ReactNode;
}

/**
 * The map's vehicle finder: only a search box floating over the map, so the map keeps all the room. Touching it (or its list
 * button) opens the list right under it; choosing a vehicle, touching the map or pressing Escape closes it again.
 */
export function VehicleList({
  vehicles,
  devices,
  positions,
  selectedVehicleId,
  onSelect,
  sharedVehicles = [],
  selectedSharedPlate = null,
  onSelectShared,
  trailing,
}: VehicleListProps) {
  const t = useT();
  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (event: Event) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        input.current?.blur();
      }
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const statusOf = (vehicle: Vehicle): VehicleStatus =>
    vehicleStatus(positions[vehicle.id], vehicle.deviceId ? (deviceById.get(vehicle.deviceId)?.lastSeenAt ?? null) : null);

  const filteredVehicles = useMemo(() => vehicles.filter((v) => matchesSearch(search, v.name, v.plate, v.fleetGroup)), [vehicles, search]);
  const filteredShared = useMemo(() => sharedVehicles.filter((v) => matchesSearch(search, v.plate)), [sharedVehicles, search]);

  const total = vehicles.length + sharedVehicles.length;

  function done() {
    setOpen(false);
    setSearch("");
    input.current?.blur();
  }

  return (
    // Top-left, clear of Google's full-screen button on the right.
    <div ref={box} className="pointer-events-none absolute top-2 right-2 left-2 z-20 flex max-w-md items-start gap-2">
      <div className="pointer-events-auto relative min-w-0 flex-1">
        <div className="flex items-center gap-1 rounded-2xl border border-white bg-white shadow-lg shadow-slate-300/40 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <Search className="pointer-events-none ml-3 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
          <input
            ref={input}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            placeholder={t("vehicles.search")}
            aria-label={t("vehicles.search")}
            aria-expanded={open}
            className="min-w-0 flex-1 bg-transparent py-2.5 pr-1 pl-1 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                input.current?.focus();
              }}
              aria-label={t("vehicles.clearSearch")}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-label={t("map.vehiclesCount", { count: total })}
            title={t("map.vehiclesCount", { count: total })}
            className="mr-1 flex shrink-0 items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <List className="h-4 w-4" />
            {total}
          </button>
        </div>

        {open && (
          <div className="styled-scrollbar absolute top-full right-0 left-0 mt-2 max-h-[min(60vh,28rem)] overflow-y-auto rounded-2xl border border-white bg-white shadow-xl shadow-slate-300/40 dark:border-white/10 dark:bg-[#0d1220] dark:shadow-black/50">
            {filteredVehicles.length === 0 && filteredShared.length === 0 && (
              <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
                {vehicles.length === 0 && sharedVehicles.length === 0 ? t("vehicles.noneYet") : t("vehicles.noMatch")}
              </p>
            )}

            {filteredVehicles.map((vehicle) => {
              const device = vehicle.deviceId ? deviceById.get(vehicle.deviceId) : undefined;
              const selected = vehicle.id === selectedVehicleId;
              const position = positions[vehicle.id];
              const status = statusOf(vehicle);
              // What it is doing, without opening it: the speed, or how long ago it last said anything.
              const doing =
                status === "moving" && position
                  ? `${Math.round(position.speed)} km/h`
                  : status === "stopped"
                    ? isIdling(position)
                      ? t("vehicles.idling")
                      : t("vehicles.stopped")
                    : null;
              const lastData = position ? t("vehicles.lastData", { when: formatRelativeTime(position.ts, t) }) : null;

              return (
                <button
                  key={vehicle.id}
                  onClick={() => {
                    onSelect(vehicle.id);
                    done();
                  }}
                  onMouseMove={trackGlow}
                  className={`glow flex w-full items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 dark:border-white/5 ${
                    selected ? "brand-gradient-soft dark:bg-blue-500/15" : "hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-medium text-slate-900 dark:text-white">{vehicle.name}</span>
                      {vehicle.fleetGroup && (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                          {vehicle.fleetGroup}
                        </span>
                      )}
                    </div>
                    {vehicle.plate && <span className="truncate text-xs text-slate-500 dark:text-slate-400">{vehicle.plate}</span>}
                    {(doing || lastData) && (
                      <span className="truncate text-xs text-slate-400 dark:text-slate-500">
                        {doing && (
                          <span className={status === "moving" ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>{doing}</span>
                        )}
                        {doing && lastData && " · "}
                        {lastData}
                      </span>
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
                    done();
                  }}
                  onMouseMove={trackGlow}
                  className={`glow flex w-full items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 dark:border-white/5 ${
                    selectedSharedPlate === vehicle.plate ? "brand-gradient-soft dark:bg-blue-500/15" : "hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-medium text-slate-900 dark:text-white">{vehicle.plate}</span>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase dark:bg-white/10 dark:text-slate-300">
                      {t("map.filterGamonal")}
                    </span>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {trailing && <div className="pointer-events-auto shrink-0">{trailing}</div>}
    </div>
  );
}
