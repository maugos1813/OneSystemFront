import { Search } from "lucide-react";
import { useState } from "react";
import { useFleet } from "../context/FleetContext";
import { useLanguage } from "../i18n";
import { isIdling, matchesSearch, thresholdsFromSettings, vehicleStatus } from "../lib/vehicleStatus";
import { AreaFilterPills } from "./AreaFilterPills";
import { VehicleStatusBadge } from "./StatusBadge";

/** The first step of the pages about one vehicle (route history, driving style): which vehicle. Everything after it is about the one chosen here. */
export function VehicleChooser({ title, subtitle, onSelect }: { title: string; subtitle: string; onSelect: (vehicleId: string) => void }) {
  const { t } = useLanguage();
  const { filteredVehicles: vehicles, devices, positions, settings } = useFleet();
  const [search, setSearch] = useState("");
  const thresholds = thresholdsFromSettings(settings);
  const seen = new Map(devices.map((d) => [d.id, d.lastSeenAt]));
  const shown = vehicles
    .filter((v) => matchesSearch(search, v.plate, v.name, v.fleetGroup))
    .sort((a, b) => (a.plate ?? a.name).localeCompare(b.plate ?? b.name));

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0e1a]">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>

        <div className="mb-4">
          <AreaFilterPills />
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("history.search")}
            aria-label={t("history.searchLabel")}
            className="field-input w-full rounded-xl border border-slate-300 py-2.5 pr-3 pl-9 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        {vehicles.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{t("history.noVehicles")}</p>}
        {vehicles.length > 0 && shown.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{t("history.noMatch")}</p>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((v) => {
            const position = positions[v.id];
            const status = vehicleStatus(position, v.deviceId ? (seen.get(v.deviceId) ?? null) : null, thresholds);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelect(v.id)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white p-4 text-left shadow-lg shadow-slate-200/50 transition hover:border-blue-300 active:scale-[0.99] dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold text-slate-900 dark:text-white">{v.plate ?? v.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    {v.plate && v.name !== v.plate && <span className="truncate text-xs text-slate-500 dark:text-slate-400">{v.name}</span>}
                    {v.fleetGroup && (
                      <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                        {v.fleetGroup}
                      </span>
                    )}
                  </span>
                </span>
                <VehicleStatusBadge status={status} idling={isIdling(position)} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
