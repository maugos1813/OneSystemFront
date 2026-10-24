import {
  BatteryLow,
  BellRing,
  Clock,
  Gauge,
  LogIn,
  LogOut,
  Settings as SettingsIcon,
  Timer,
  WifiOff,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AreaFilterPills } from "../components/AreaFilterPills";
import { useFleet } from "../context/FleetContext";
import { useT, type MessageKey, type Translate } from "../i18n";
import type { Alert, AlertType } from "../lib/alerts";
import { trackGlow } from "../lib/glow";

const ALERT_META: Record<AlertType, { label: MessageKey; color: string; icon: typeof WifiOff }> = {
  offline: { label: "alertType.offline", color: "#64748b", icon: WifiOff },
  low_voltage: { label: "alertType.lowVoltage", color: "#f97316", icon: BatteryLow },
  after_hours: { label: "alertType.afterHours", color: "#7c3aed", icon: Clock },
  speeding: { label: "alertType.speeding", color: "#dc2626", icon: Gauge },
  excessive_idling: { label: "alertType.idling", color: "#f59e0b", icon: Timer },
  geofence_enter: { label: "alertType.geofenceEnter", color: "#3b82f6", icon: LogIn },
  geofence_exit: { label: "alertType.geofenceExit", color: "#3b82f6", icon: LogOut },
};

function relativeTime(iso: string, t: Translate): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return t("time.justNow");
  if (seconds < 3600) return t("time.minutesAgo", { count: Math.round(seconds / 60) });
  return t("time.hoursAgo", { count: Math.round(seconds / 3600) });
}

function AlertCard({ alert }: { alert: Alert }) {
  const t = useT();
  const meta = ALERT_META[alert.type];
  const Icon = meta.icon;
  return (
    <div
      onMouseMove={trackGlow}
      className="glow float-card flex items-center gap-3 rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{alert.vehicleName}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{alert.message}</p>
      </div>
      {alert.since && (
        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{relativeTime(alert.since, t)}</span>
      )}
    </div>
  );
}

export function AlertsPage() {
  const t = useT();
  const { alerts: allAlerts, filteredVehicles, settings } = useFleet();

  const alerts = useMemo(() => {
    const visibleIds = new Set(filteredVehicles.map((v) => v.id));
    return allAlerts.filter((a) => visibleIds.has(a.vehicleId));
  }, [allAlerts, filteredVehicles]);

  const counts = alerts.reduce<Partial<Record<AlertType, number>>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0e1a]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("alerts.title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("alertsPage.subtitle")}
          </p>
        </div>
        <Link
          to="/ajustes"
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:bg-[#111729] dark:text-slate-300 dark:hover:bg-white/10"
        >
          <SettingsIcon className="h-4 w-4" />
          {t("alertsPage.configure")}
        </Link>
      </div>

      <div className="mb-6">
        <AreaFilterPills />
      </div>

      {settings && (
        <div className="mb-6 flex flex-wrap gap-2">
          {(Object.keys(ALERT_META) as AlertType[]).map((type) => {
            const count = counts[type];
            if (!count) return null;
            const meta = ALERT_META[type];
            return (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
              >
                {t(meta.label)} · {count}
              </span>
            );
          })}
        </div>
      )}

      {alerts.length === 0 && (
        <div className="glow float-card flex flex-col items-center gap-2 rounded-3xl border border-white bg-white p-10 text-center shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <BellRing className="h-8 w-8 text-emerald-500" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("alertsPage.noneTitle")}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{t("alertsPage.noneHint")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert, i) => (
          <AlertCard key={`${alert.vehicleId}-${alert.type}-${i}`} alert={alert} />
        ))}
      </div>
    </div>
  );
}
