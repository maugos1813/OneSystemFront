import { Bell, Download } from "lucide-react";
import { useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useAppUpdate } from "../context/AppUpdateContext";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { useSeenAlerts } from "../hooks/useSeenAlerts";
import { useT } from "../i18n";

/** How many notices the panel lists; the rest wait for the next time it opens (or are all on the Alertas page). */
const LISTED = 6;

export function AlertsPanel() {
  const t = useT();
  const { alerts } = useFleet();
  const { currentUser } = useAuth();
  // Without the Alertas section the page of alerts is closed: the list leads to the vehicles instead.
  const seeAllTo = currentUser?.role === "owner" || currentUser?.role === "admin" || currentUser?.modules.includes("alertas") ? "/alertas" : "/vehiculos";
  const update = useAppUpdate();
  // The bell only calls attention to what this person has not seen: a notice already looked at does not come back until it
  // ends and returns.
  const { unseen, markAllSeen } = useSeenAlerts(currentUser?.userId, alerts);
  // A newer Android app counts as one more notification, so the bell calls attention to it.
  const count = unseen.length + (update.available ? 1 : 0);
  const [open, setOpen] = useState(false);
  /** Closing the panel is what marks the notices it listed as seen (they stay readable while it is open). */
  const close = () => {
    markAllSeen(unseen.slice(0, LISTED));
    setOpen(false);
  };
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
          if (open) close();
          else setOpen(true);
        }}
        className="relative rounded-xl p-2 text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
        aria-label={t("alerts.title")}
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
          <div className="fixed inset-0 z-10" onClick={close} />
          <div
            style={{ "--panel-top": `${top}px` } as CSSProperties}
            className="fixed inset-x-3 top-[var(--panel-top)] z-20 max-h-[70vh] overflow-y-auto rounded-2xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80 border border-violet-100 bg-white p-2 shadow-lg shadow-violet-100 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
            <p className="px-2 py-1 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
              {t("alerts.title")}
            </p>
            {update.available && update.latest && (
              <div className="mb-1 rounded-lg bg-blue-50 px-2 py-2 text-sm text-slate-800 dark:bg-blue-500/10 dark:text-slate-100">
                <p className="font-medium">{t("alerts.newVersion", { version: update.latest.versionName })}</p>
                <button
                  type="button"
                  onClick={() => {
                    void update.install();
                    close();
                  }}
                  className="brand-button mt-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  <Download className="h-3.5 w-3.5" /> {t("alerts.install")}
                </button>
              </div>
            )}
            {unseen.length === 0 && !update.available && (
              <p className="px-2 py-3 text-sm text-slate-500 dark:text-slate-400">{t("alerts.none")}</p>
            )}
            {unseen.slice(0, LISTED).map((alert, i) => {
              const CLASS = "block rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-white/5";
              const key = `${alert.vehicleId}-${alert.type}-${i}`;
              return alert.link ? (
                <Link key={key} to={alert.link} onClick={close} className={CLASS}>
                  {alert.message}
                </Link>
              ) : (
                <div key={key} className={CLASS}>
                  {alert.message}
                </div>
              );
            })}
            {alerts.length > 0 && (
              <Link
                to={seeAllTo}
                onClick={close}
                className="mt-1 block rounded-lg px-2 py-2 text-center text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-white/5"
              >
                {t("alerts.seeAll", { count: alerts.length })}
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
