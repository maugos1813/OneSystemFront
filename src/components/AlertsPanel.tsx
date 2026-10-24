import { Bell, Download } from "lucide-react";
import { useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useAppUpdate } from "../context/AppUpdateContext";
import { useFleet } from "../context/FleetContext";

export function AlertsPanel() {
  const { alerts } = useFleet();
  const update = useAppUpdate();
  // A newer Android app counts as one more notification, so the bell calls attention to it.
  const count = alerts.length + (update.available ? 1 : 0);
  const [open, setOpen] = useState(false);
  // On a phone the bell is in the middle of the bar, so a panel hanging from it would run off the screen: there it opens
  // across the screen, just below the bell. On a larger screen it hangs from the bell as before.
  const button = useRef<HTMLButtonElement>(null);
  const [top, setTop] = useState(0);

  return (
    <div className="relative">
      <button
        ref={button}
        onClick={() => {
          setTop((button.current?.getBoundingClientRect().bottom ?? 56) + 8);
          setOpen((o) => !o);
        }}
        className="relative rounded-xl p-2 text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
        aria-label="Alertas"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            style={{ "--panel-top": `${top}px` } as CSSProperties}
            className="fixed inset-x-3 top-[var(--panel-top)] z-20 max-h-[70vh] overflow-y-auto rounded-2xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80 border border-violet-100 bg-white p-2 shadow-lg shadow-violet-100 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
            <p className="px-2 py-1 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
              Alertas
            </p>
            {update.available && update.latest && (
              <div className="mb-1 rounded-lg bg-blue-50 px-2 py-2 text-sm text-slate-800 dark:bg-blue-500/10 dark:text-slate-100">
                <p className="font-medium">Hay una versión nueva de la app ({update.latest.versionName})</p>
                <button
                  type="button"
                  onClick={() => {
                    void update.install();
                    setOpen(false);
                  }}
                  className="brand-button mt-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  <Download className="h-3.5 w-3.5" /> Instalar actualización
                </button>
              </div>
            )}
            {alerts.length === 0 && !update.available && (
              <p className="px-2 py-3 text-sm text-slate-500 dark:text-slate-400">Sin alertas activas.</p>
            )}
            {alerts.slice(0, 6).map((alert, i) => (
              <div
                key={`${alert.vehicleId}-${alert.type}-${i}`}
                className="rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-white/5"
              >
                {alert.message}
              </div>
            ))}
            {alerts.length > 0 && (
              <Link
                to="/alertas"
                onClick={() => setOpen(false)}
                className="mt-1 block rounded-lg px-2 py-2 text-center text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-white/5"
              >
                Ver todas ({alerts.length})
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
