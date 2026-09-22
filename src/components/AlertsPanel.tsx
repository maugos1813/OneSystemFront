import { Bell } from "lucide-react";
import { useState } from "react";
import { useFleet } from "../context/FleetContext";
import { computeAlerts } from "../lib/alerts";

export function AlertsPanel() {
  const { vehicles, devices, positions } = useFleet();
  const [open, setOpen] = useState(false);
  const alerts = computeAlerts(vehicles, devices, positions);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-xl p-2 text-slate-500 transition hover:bg-violet-50 hover:text-slate-900"
        aria-label="Alertas"
      >
        <Bell className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-violet-100 bg-white p-2 shadow-lg shadow-violet-100">
            <p className="px-2 py-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Alertas
            </p>
            {alerts.length === 0 && (
              <p className="px-2 py-3 text-sm text-slate-500">Sin alertas activas.</p>
            )}
            {alerts.map((alert, i) => (
              <div
                key={`${alert.vehicleId}-${alert.type}-${i}`}
                className="rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-violet-50"
              >
                {alert.message}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
