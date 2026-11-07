import { Maximize, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "../i18n";
import type { VehicleStatus } from "../lib/vehicleStatus";
import { AreaFilterPills } from "./AreaFilterPills";

interface MapFiltersPanelProps {
  open: boolean;
  onClose: () => void;
  statusFilter: VehicleStatus | null;
  onStatusFilter: (status: VehicleStatus | null) => void;
  counts: Record<VehicleStatus, number> & { all: number };
  /** The map's own pills for a client who also sees Gamonal's vehicles. */
  sourcePills?: ReactNode;
  onFitFleet: () => void;
  /** How many vehicles the map shows with these filters: it is what the button on a phone says it will show. */
  shownCount: number;
  activeFilters: number;
  onClear: () => void;
}

const SECTION = "px-4 py-4 border-b border-slate-100 dark:border-white/5";
const TITLE = "mb-2.5 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500";

/** The button that opens the filters (to the right of the search), with how many are on. */
export function MapFiltersButton({ onClick, active }: { onClick: () => void; active: number }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("map.filtersTitle")}
      title={t("map.filtersTitle")}
      className="relative flex h-[42px] w-[42px] items-center justify-center rounded-2xl border border-white bg-white text-slate-600 shadow-lg shadow-slate-300/40 hover:text-slate-900 dark:border-white/10 dark:bg-[#111729] dark:text-slate-300 dark:shadow-black/40 dark:hover:text-white"
    >
      <SlidersHorizontal className="h-4 w-4" />
      {active > 0 && (
        <span className="brand-button absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold">
          {active}
        </span>
      )}
    </button>
  );
}

/**
 * The filters and options of the map, in a bar that opens from the right: beside the map on a big screen, over the whole
 * screen on a phone (where it ends in a button saying how many vehicles the filters leave).
 */
export function MapFiltersPanel({
  open,
  onClose,
  statusFilter,
  onStatusFilter,
  counts,
  sourcePills,
  onFitFleet,
  shownCount,
  activeFilters,
  onClear,
}: MapFiltersPanelProps) {
  const t = useT();
  const statuses: Array<[VehicleStatus | null, string, number]> = [
    [null, t("vehicles.filterAll"), counts.all],
    ["moving", t("vehicles.filterMoving"), counts.moving],
    ["stopped", t("vehicles.filterStopped"), counts.stopped],
    ["offline", t("vehicles.filterOffline"), counts.offline],
  ];

  return (
    <aside
      aria-hidden={!open}
      className={`absolute inset-0 z-30 flex flex-col bg-white transition-[transform,visibility] duration-200 sm:left-auto sm:w-80 sm:border-l sm:border-violet-100 sm:shadow-2xl dark:bg-[#0d1220] dark:sm:border-white/5 ${
        open ? "translate-x-0" : "invisible translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between border-b border-violet-100 px-4 py-3 dark:border-white/5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("map.filtersTitle")}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="styled-scrollbar flex-1 overflow-y-auto">
        <section className={SECTION}>
          <p className={TITLE}>{t("map.sectionStatus")}</p>
          <div className="flex flex-wrap gap-2">
            {statuses.map(([value, label, count]) => (
              <button
                key={label}
                type="button"
                aria-pressed={statusFilter === value}
                onClick={() => onStatusFilter(value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  statusFilter === value
                    ? "brand-button"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {label} <span className="opacity-70">{count}</span>
              </button>
            ))}
          </div>
        </section>

        {sourcePills && (
          <section className={SECTION}>
            <p className={TITLE}>{t("map.sectionSource")}</p>
            {sourcePills}
          </section>
        )}

        <section className={`${SECTION} [&:not(:has(button))]:hidden`}>
          <AreaFilterTitled />
        </section>

        <section className={SECTION}>
          <p className={TITLE}>{t("map.sectionView")}</p>
          <button
            type="button"
            onClick={() => {
              onFitFleet();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            <Maximize className="h-4 w-4" />
            {t("map.fitFleet")}
          </button>
        </section>
      </div>

      <div className="flex items-center gap-2 border-t border-violet-100 p-3 dark:border-white/5">
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
          >
            {t("map.clearFilters")}
          </button>
        )}
        {/* The map is hidden behind the panel on a phone, so the way back says what the filters leave on it. */}
        <button type="button" onClick={onClose} className="brand-button flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold sm:hidden">
          {t("map.showVehicles", { count: shownCount })}
        </button>
      </div>
    </aside>
  );
}

/** The flota/client filter with its heading, only when there are several to choose from. */
function AreaFilterTitled() {
  const t = useT();
  return (
    <>
      <p className={TITLE}>{t("map.sectionFleet")}</p>
      <AreaFilterPills />
    </>
  );
}
