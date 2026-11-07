import { AlertTriangle, ArrowRight, BellRing, CircleCheck, Gauge, Navigation, Pause, WifiOff } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { useT } from "../i18n";
import { trackGlow } from "../lib/glow";
import { homeShortcuts } from "../lib/oneTrackNav";
import { thresholdsFromSettings, vehicleStatus, type VehicleStatus } from "../lib/vehicleStatus";

const CARD =
  "glow float-card rounded-3xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40";

const SEGMENT: Record<VehicleStatus, string> = { moving: "bg-emerald-500", stopped: "bg-sky-500", offline: "bg-red-500" };

/**
 * OneTrack's start: how the fleet is doing right now, what needs attention, and a shortcut to every section that is not in the phone's
 * bottom bar. The client chooses where to go from here instead of being dropped onto the map.
 */
export function HomePage() {
  const t = useT();
  const { currentUser } = useAuth();
  const { filteredVehicles: vehicles, devices, positions, alerts, settings, loading } = useFleet();

  const summary = useMemo(() => {
    const seen = new Map(devices.map((d) => [d.id, d.lastSeenAt]));
    const thresholds = thresholdsFromSettings(settings);
    const counts: Record<VehicleStatus, number> = { moving: 0, stopped: 0, offline: 0 };
    let speedSum = 0;
    const moving: Array<{ id: string; name: string; speed: number }> = [];
    for (const v of vehicles) {
      const position = positions[v.id];
      const status = vehicleStatus(position, v.deviceId ? (seen.get(v.deviceId) ?? null) : null, thresholds);
      counts[status] += 1;
      if (status === "moving" && position) {
        speedSum += position.speed;
        moving.push({ id: v.id, name: v.plate ?? v.name, speed: Math.round(position.speed) });
      }
    }
    moving.sort((a, b) => b.speed - a.speed);
    return { counts, avgSpeed: counts.moving > 0 ? Math.round(speedSum / counts.moving) : 0, moving: moving.slice(0, 3) };
  }, [vehicles, devices, positions, settings]);

  const total = vehicles.length;
  const shortcuts = homeShortcuts(currentUser);
  const name = currentUser?.name.trim() || currentUser?.orgName || "";

  const stats: Array<{ to: string; label: string; value: number; sub: string; Icon: typeof Navigation; tone: string }> = [
    {
      to: "/gps?estado=moving",
      label: t("home.moving"),
      value: summary.counts.moving,
      sub: summary.counts.moving > 0 ? t("home.avgSpeed", { speed: summary.avgSpeed }) : t("home.ofTotal", { total }),
      Icon: Navigation,
      tone: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15",
    },
    {
      to: "/gps?estado=stopped",
      label: t("home.stopped"),
      value: summary.counts.stopped,
      sub: t("home.ofTotal", { total }),
      Icon: Pause,
      tone: "text-sky-600 bg-sky-100 dark:text-sky-300 dark:bg-sky-500/15",
    },
    {
      to: "/gps?estado=offline",
      label: t("home.offline"),
      value: summary.counts.offline,
      sub: summary.counts.offline === 0 ? t("home.allGood") : t("home.ofTotal", { total }),
      Icon: WifiOff,
      tone: summary.counts.offline > 0 ? "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-500/15" : "text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-white/5",
    },
    {
      to: "/alertas",
      label: t("home.alerts"),
      value: alerts.length,
      sub: alerts.length === 0 ? t("home.allGood") : t("home.needAttention"),
      Icon: BellRing,
      tone: alerts.length > 0 ? "text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-500/15" : "text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-white/5",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:space-y-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t("home.greeting", { name })}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("home.subtitle")}</p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</p>
      ) : total === 0 ? (
        <div className={CARD}>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("home.noVehicles")}</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {stats.map(({ to, label, value, sub, Icon, tone }) => {
              const body = (
                <>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {label}
                  </div>
                  <p className="mt-2 text-4xl leading-none font-semibold tracking-tight text-slate-900 tabular-nums lg:text-5xl dark:text-white">{value}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>
                </>
              );
              // With nothing in it (no vehicle without signal, no alert) there is nothing to open: an empty map or list would only confuse.
              return value > 0 ? (
                <Link key={label} to={to} onMouseMove={trackGlow} className={`${CARD} block transition active:scale-[0.98] lg:hover:-translate-y-0.5`}>
                  {body}
                </Link>
              ) : (
                <div key={label} className={`${CARD} cursor-default`}>
                  {body}
                </div>
              );
            })}
          </section>

          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6 [&>section]:h-full">
          <section className={CARD}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("home.fleetState")}</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {total} {t("home.vehicles")}
              </span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="img" aria-label={t("home.fleetState")}>
              {(["moving", "stopped", "offline"] as const).map((status) =>
                summary.counts[status] > 0 ? <span key={status} className={SEGMENT[status]} style={{ width: `${(summary.counts[status] / total) * 100}%` }} /> : null,
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
              {(
                [
                  ["moving", t("home.moving")],
                  ["stopped", t("home.stopped")],
                  ["offline", t("home.offline")],
                ] as const
              ).map(([status, label]) => (
                <span key={status} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${SEGMENT[status]}`} />
                  {label} <strong className="text-slate-900 dark:text-white">{summary.counts[status]}</strong>
                </span>
              ))}
            </div>
          </section>

          <section className={CARD}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("home.needAttention")}</h2>
              <Link to="/alertas" className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                {t("home.seeAll")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {alerts.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <CircleCheck className="h-4 w-4 text-emerald-500" /> {t("home.noAlerts")}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/10">
                {alerts.slice(0, 3).map((alert, index) => (
                  <li key={`${alert.vehicleId}-${alert.type}-${index}`}>
                    <Link to={alert.link ?? "/alertas"} className="flex items-start gap-2.5 py-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span className="min-w-0 text-sm text-slate-700 dark:text-slate-300">{alert.message}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          </div>

          {summary.moving.length > 0 && (
            <section className={CARD}>
              <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t("home.movingNow")}</h2>
              <ul className="divide-y divide-slate-100 md:grid md:grid-cols-3 md:gap-x-8 md:divide-y-0 dark:divide-white/10">
                {summary.moving.map((vehicle) => (
                  <li key={vehicle.id} className="flex items-center justify-between py-2 text-sm md:border-b md:border-slate-100 md:dark:border-white/10">
                    <span className="font-medium text-slate-900 dark:text-white">{vehicle.name}</span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                      <Gauge className="h-3.5 w-3.5" /> {vehicle.speed} km/h
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {shortcuts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("home.shortcuts")}</h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t("home.shortcutsHint")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {shortcuts.map(({ to, label, hint, icon: Icon }) => (
              <Link key={to} to={to} onMouseMove={trackGlow} className={`${CARD} block transition active:scale-[0.98]`}>
                <span className="brand-gradient-soft flex h-10 w-10 items-center justify-center rounded-2xl text-blue-600 dark:text-blue-400">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{t(label)}</p>
                {hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t(hint)}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
