import { X } from "lucide-react";
import { useT } from "../i18n";
import { formatRelativeTime } from "../lib/relativeTime";
import type { SharedVehicle } from "../lib/types";

/** What a client sees of a Gamonal vehicle shared through Gamonal Driver: only where it is and how it is moving. */
export function SharedVehiclePanel({ vehicle, onClose }: { vehicle: SharedVehicle; onClose: () => void }) {
  const t = useT();
  const moving = (vehicle.speed ?? 0) > 0;
  const status = moving ? t("map.legendMoving") : vehicle.ignition ? t("map.legendIdle") : t("map.legendOff");
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 rounded-t-3xl border border-white bg-white p-4 shadow-xl shadow-slate-300/30 sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-auto sm:w-72 sm:rounded-3xl dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">{vehicle.plate}</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600 uppercase dark:bg-white/10 dark:text-slate-300">
            {t("map.filterGamonal")}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white" aria-label={t("detail.close")}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="divide-y divide-slate-100 text-sm dark:divide-white/10">
        <div className="flex items-center justify-between py-1.5">
          <span className="text-slate-500 dark:text-slate-400">{t("detail.status")}</span>
          <span className="font-medium text-slate-900 dark:text-white">{status}</span>
        </div>
        {vehicle.speed !== null && (
          <div className="flex items-center justify-between py-1.5">
            <span className="text-slate-500 dark:text-slate-400">{t("detail.speed")}</span>
            <span className="font-medium text-slate-900 dark:text-white">{Math.round(vehicle.speed)} km/h</span>
          </div>
        )}
        {vehicle.updatedAt && (
          <div className="flex items-center justify-between py-1.5">
            <span className="text-slate-500 dark:text-slate-400">{t("detail.lastPosition")}</span>
            <span className="font-medium text-slate-900 dark:text-white">{formatRelativeTime(vehicle.updatedAt, t)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
