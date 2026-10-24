import { useAuth } from "../context/AuthContext";
import { X } from "lucide-react";
import { useT, type Translate } from "../i18n";
import { describeEvent } from "../lib/deviceEvents";
import { AVL_ID, type DeviceEvent, type Position, type Vehicle } from "../lib/types";
import { SpeedChart } from "./SpeedChart";

interface VehicleDetailPanelProps {
  vehicle: Vehicle;
  position: Position | null;
  events: DeviceEvent[];
  history: Position[];
  historyRangeHours: number | null;
  onHistoryRangeChange: (hours: number | null) => void;
  onClose: () => void;
}

const HISTORY_RANGES = [
  { label: "detail.noRoute", hours: null },
  { label: "24h", hours: 24 },
  { label: "detail.days7", hours: 24 * 7 },
] as const;

function formatRelativeTime(iso: string, t: Translate): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return t("time.secondsAgo", { count: seconds });
  if (seconds < 3600) return t("time.minutesAgo", { count: Math.round(seconds / 60) });
  if (seconds < 86400) return t("time.hoursAgo", { count: Math.round(seconds / 3600) });
  return t("time.daysAgo", { count: Math.round(seconds / 86400) });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

export function VehicleDetailPanel({
  vehicle,
  position,
  events,
  history,
  historyRangeHours,
  onHistoryRangeChange,
  onClose,
}: VehicleDetailPanelProps) {
  const t = useT();
  const { currentUser } = useAuth();
  // The route is the history behind Historial and Analíticas; an account with neither doesn't get it.
  const canSeeHistory =
    currentUser?.role === "owner" ||
    currentUser?.role === "admin" ||
    !!currentUser?.modules.some((m) => m === "historial" || m === "analiticas");
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 max-h-[75vh] overflow-y-auto rounded-t-3xl border border-white bg-white p-4 shadow-xl shadow-slate-300/30 sm:absolute sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-auto sm:max-h-[calc(100%-2rem)] sm:w-80 sm:rounded-3xl dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">{vehicle.name}</h2>
          {vehicle.plate && <p className="text-xs text-slate-500 dark:text-slate-400">{vehicle.plate}</p>}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white"
          aria-label={t("detail.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!position && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.noPositions")}</p>
      )}

      {position && (
        <div className="divide-y divide-slate-100 dark:divide-white/10">
          <Row label={t("detail.speed")} value={`${position.speed} km/h`} />
          <Row
            label={t("detail.ignition")}
            value={
              position.ioData[AVL_ID.IGNITION] === 1 || position.ioData[AVL_ID.IGNITION] === "1"
                ? t("detail.ignitionOn")
                : t("detail.ignitionOff")
            }
          />
          <Row
            label={t("detail.voltage")}
            value={
              position.ioData[AVL_ID.EXTERNAL_VOLTAGE] !== undefined
                ? `${(Number(position.ioData[AVL_ID.EXTERNAL_VOLTAGE]) / 1000).toFixed(1)} V`
                : "—"
            }
          />
          <Row label={t("detail.satellites")} value={position.satellites !== null ? String(position.satellites) : "—"} />
          <Row label={t("detail.lastPosition")} value={formatRelativeTime(position.ts, t)} />
        </div>
      )}

      {canSeeHistory && (
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
          {t("detail.route")}
        </p>
        <div className="flex gap-1.5">
          {HISTORY_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => onHistoryRangeChange(range.hours)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                historyRangeHours === range.hours
                  ? "brand-button"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              {range.label.startsWith("detail.") ? t(range.label as "detail.noRoute") : range.label}
            </button>
          ))}
        </div>

        {historyRangeHours !== null && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
              {t("detail.speed")}
            </p>
            <SpeedChart positions={history} />
          </div>
        )}
      </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
          {t("detail.recentActivity")}
        </p>
        {events.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("detail.noEvents")}</p>
        )}
        <ul className="space-y-2">
          {events.slice(0, 8).map((event) => (
            <li key={event.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">{describeEvent(event, t).label}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(event.ts, t)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
