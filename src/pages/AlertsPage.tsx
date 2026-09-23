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
import { Link } from "react-router-dom";
import { useFleet } from "../context/FleetContext";
import type { Alert, AlertType } from "../lib/alerts";
import { trackGlow } from "../lib/glow";

const ALERT_META: Record<AlertType, { label: string; color: string; icon: typeof WifiOff }> = {
  offline: { label: "Desconectado", color: "#64748b", icon: WifiOff },
  low_voltage: { label: "Batería baja", color: "#f97316", icon: BatteryLow },
  after_hours: { label: "Fuera de horario", color: "#7c3aed", icon: Clock },
  speeding: { label: "Exceso de velocidad", color: "#dc2626", icon: Gauge },
  excessive_idling: { label: "Motor encendido detenido", color: "#f59e0b", icon: Timer },
  geofence_enter: { label: "Entró a geocerca", color: "#3b82f6", icon: LogIn },
  geofence_exit: { label: "Salió de geocerca", color: "#3b82f6", icon: LogOut },
};

function relativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "recién";
  if (seconds < 3600) return `hace ${Math.round(seconds / 60)}min`;
  return `hace ${Math.round(seconds / 3600)}h`;
}

function AlertCard({ alert }: { alert: Alert }) {
  const meta = ALERT_META[alert.type];
  const Icon = meta.icon;
  return (
    <div onMouseMove={trackGlow} className="glow float-card flex items-center gap-3 rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{alert.vehicleName}</p>
        <p className="truncate text-xs text-slate-500">{alert.message}</p>
      </div>
      {alert.since && <span className="shrink-0 text-xs text-slate-400">{relativeTime(alert.since)}</span>}
    </div>
  );
}

export function AlertsPage() {
  const { alerts, settings } = useFleet();

  const counts = alerts.reduce<Partial<Record<AlertType, number>>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Alertas</h1>
          <p className="text-sm text-slate-500">Todo lo que está activo ahora mismo en tu flota.</p>
        </div>
        <Link
          to="/ajustes"
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <SettingsIcon className="h-4 w-4" />
          Configurar alertas
        </Link>
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
                {meta.label} · {count}
              </span>
            );
          })}
        </div>
      )}

      {alerts.length === 0 && (
        <div className="glow float-card flex flex-col items-center gap-2 rounded-3xl border border-white bg-white p-10 text-center shadow-lg shadow-slate-200/50">
          <BellRing className="h-8 w-8 text-emerald-500" />
          <p className="text-sm font-medium text-slate-700">Sin alertas activas.</p>
          <p className="text-xs text-slate-400">Toda la flota está dentro de lo esperado.</p>
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
