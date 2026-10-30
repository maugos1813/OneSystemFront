import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getVehicleDriver } from "../lib/api";
import { History, Map as MapIcon, Navigation, Phone, Wrench, X, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useT } from "../i18n";
import { formatRelativeTime } from "../lib/relativeTime";
import { AVL_ID, type Position, type Vehicle, type VehicleDriver } from "../lib/types";
import { SpeedChart } from "./SpeedChart";

interface VehicleDetailPanelProps {
  vehicle: Vehicle;
  position: Position | null;
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

const ACTION_CLASS =
  "flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10";

/** One shortcut of the panel's action grid: an in-app link, an external one (`href`), or a disabled button with the reason. */
function Action({
  icon: Icon,
  label,
  hint,
  to,
  href,
}: {
  icon: LucideIcon;
  label: string;
  hint?: ReactNode;
  to?: string;
  href?: string;
}) {
  const body = (
    <>
      <Icon className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        {hint && <span className="block truncate text-xs font-normal text-slate-400 dark:text-slate-500">{hint}</span>}
      </span>
    </>
  );
  if (to)
    return (
      <Link to={to} className={ACTION_CLASS}>
        {body}
      </Link>
    );
  if (href) {
    return (
      <a href={href} target={href.startsWith("tel:") ? undefined : "_blank"} rel="noreferrer" className={ACTION_CLASS}>
        {body}
      </a>
    );
  }
  return (
    <button
      type="button"
      disabled
      className={`${ACTION_CLASS} cursor-not-allowed opacity-50 hover:border-slate-200 hover:bg-slate-50`}
    >
      {body}
    </button>
  );
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
  history,
  historyRangeHours,
  onHistoryRangeChange,
  onClose,
}: VehicleDetailPanelProps) {
  const t = useT();
  const { currentUser } = useAuth();
  // The route is the history behind Historial and Analíticas; an account with neither doesn't get it.
  const hasAccess = (...modules: string[]) =>
    currentUser?.role === "owner" ||
    currentUser?.role === "admin" ||
    !!currentUser?.modules.some((m) => modules.includes(m));
  const canSeeHistory = hasAccess("historial", "analiticas");
  // Who drove it lately is about people: it needs the Conducción section.
  const canSeeDriver = hasAccess("conduccion");
  const canSeeCockpit = hasAccess("cockpit");
  const canSeeMaintenance = hasAccess("mantenimiento");
  const [driver, setDriver] = useState<VehicleDriver | null>(null);
  const phone = driver?.driver?.phone ?? null;
  useEffect(() => {
    setDriver(null);
    if (!canSeeDriver) return;
    let cancelled = false;
    getVehicleDriver(vehicle.id)
      .then((d) => !cancelled && setDriver(d))
      .catch(() => undefined); // an identification that fails is simply not shown
    return () => {
      cancelled = true;
    };
  }, [vehicle.id, canSeeDriver]);

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

      {!position && <p className="text-sm text-slate-500 dark:text-slate-400">{t("detail.noPositions")}</p>}

      {position && (
        <div className="divide-y divide-slate-100 dark:divide-white/10">
          {driver?.driver && (
            <div className="py-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">{t("detail.driver")}</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {driver.driver.name}
                  {driver.confidence === "low" && (
                    <span className="ml-1 text-xs font-normal text-slate-400">({t("detail.driverProbable")})</span>
                  )}
                </span>
              </div>
              {driver.others.length > 0 && (
                <p className="mt-0.5 text-right text-xs text-slate-400 dark:text-slate-500">
                  {t("detail.driverAlso")}: {driver.others.map((o) => o.name).join(", ")}
                </p>
              )}
            </div>
          )}
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
          <Row
            label={t("detail.satellites")}
            value={position.satellites !== null ? String(position.satellites) : "—"}
          />
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
          {t("detail.actions")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {canSeeHistory && (
            <Action icon={History} label={t("detail.tripHistory")} to={`/historial?vehicle=${vehicle.id}`} />
          )}
          {canSeeCockpit && <Action icon={MapIcon} label={t("detail.mapView")} to={`/cockpit?vehicle=${vehicle.id}`} />}
          {canSeeDriver && (
            <Action
              icon={Phone}
              label={t("detail.call")}
              href={phone ? `tel:${phone}` : undefined}
              hint={
                driver?.driver
                  ? phone
                    ? driver.driver.name
                    : t("detail.callNoPhone", { name: driver.driver.name })
                  : t("detail.callNoDriver")
              }
            />
          )}
          {canSeeMaintenance && (
            <Action
              icon={Wrench}
              label={t("detail.maintenance")}
              to={`/mantenimiento?q=${encodeURIComponent(vehicle.plate ?? vehicle.name)}`}
            />
          )}
          {position && (
            <Action
              icon={Navigation}
              label={t("detail.navigate")}
              href={`https://www.google.com/maps/dir/?api=1&destination=${position.lat},${position.lng}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
