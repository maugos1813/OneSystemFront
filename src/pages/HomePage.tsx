import { AlertTriangle, ArrowRight, BellRing, CalendarDays, Car, ChevronRight, CircleCheck, Gauge, MapPin, Pause, ShieldCheck, WifiOff, Zap } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { useLanguage, useT } from "../i18n";
import { homeShortcuts } from "../lib/oneTrackNav";
import { formatDate } from "../lib/time";
import { thresholdsFromSettings, vehicleStatus, type VehicleStatus } from "../lib/vehicleStatus";

/** A frosted glass card over the light wallpaper (solid navy in the dark theme). */
const CARD = "glass glow rounded-[1.75rem] p-5";
/** "Dettagli →", "Vedi tutti →"…: a small glass pill. */
const LINK =
  "glass-bubble flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-semibold text-blue-600 transition hover:text-blue-700 active:scale-95 dark:text-sky-300 dark:hover:text-sky-200";

/** The icon in front of a section's title, in its own glass pebble. */
function TitleIcon({ icon: Icon, className = "text-slate-600 dark:text-slate-300" }: { icon: typeof Car; className?: string }) {
  return (
    <span className={`glass-bubble flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${className}`}>
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

/** The share of each state, as a tinted glass pill. */
const SHARE_PILL: Record<VehicleStatus, string> = {
  moving: "bg-emerald-50/80 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  stopped: "bg-slate-100/80 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  offline: "bg-violet-50/80 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};

/** The colour of each state on the ring and in its legend. */
const STATE_COLOR: Record<VehicleStatus, string> = { moving: "#22c55e", stopped: "#cbd5e1", offline: "#8b5cf6" };

/** The tint of each shortcut's icon, in turn, so the row reads as a set of different places. */
const SHORTCUT_TINTS = ["text-blue-600", "text-indigo-500", "text-emerald-600", "text-violet-600", "text-sky-600", "text-fuchsia-600"];

/**
 * OneTrack's start: how the fleet is doing right now, what needs attention, and a shortcut to every section that is not in the phone's
 * bottom bar. The client chooses where to go from here instead of being dropped onto the map.
 */
export function HomePage() {
  const t = useT();
  const { locale } = useLanguage();
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
    return { counts, avgSpeed: counts.moving > 0 ? Math.round(speedSum / counts.moving) : 0, moving: moving.slice(0, 6) };
  }, [vehicles, devices, positions, settings]);

  const total = vehicles.length;
  const shortcuts = homeShortcuts(currentUser);
  const name = currentUser?.name.trim() || currentUser?.orgName || "";
  const today = formatDate(new Date(), locale, { day: "numeric", month: "long", year: "numeric" });
  const ofTotal = `${t("home.ofTotal", { total })} ${t("home.vehicles")}`;

  const stats: Array<{ to: string; label: string; value: number; sub: string; Icon: typeof Car; tone: string }> = [
    {
      to: "/gps?estado=moving",
      label: t("home.moving"),
      value: summary.counts.moving,
      sub: summary.counts.moving > 0 ? t("home.avgSpeed", { speed: summary.avgSpeed }) : ofTotal,
      Icon: Car,
      tone: "text-slate-700 dark:text-slate-200",
    },
    {
      to: "/gps?estado=stopped",
      label: t("home.stopped"),
      value: summary.counts.stopped,
      sub: ofTotal,
      Icon: Pause,
      tone: "text-slate-700 dark:text-slate-200",
    },
    {
      to: "/gps?estado=offline",
      label: t("home.offline"),
      value: summary.counts.offline,
      sub: summary.counts.offline === 0 ? t("home.allGood") : ofTotal,
      Icon: WifiOff,
      tone: summary.counts.offline > 0 ? "text-red-500 ring-2 ring-red-200/80 dark:ring-red-500/30" : "text-slate-500 dark:text-slate-400",
    },
    {
      to: "/alertas",
      label: t("home.alerts"),
      value: alerts.length,
      sub: alerts.length === 0 ? t("home.allGood") : t("home.needAttention"),
      Icon: BellRing,
      tone: alerts.length > 0 ? "text-violet-600 ring-2 ring-violet-200/80 dark:text-violet-300 dark:ring-violet-500/30" : "text-slate-500 dark:text-slate-400",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:space-y-6 lg:px-8 lg:pt-2 lg:pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
            {t("home.greeting", { name })} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base dark:text-slate-400">{t("home.subtitle")}</p>
        </div>
        <p className="glass hidden items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-700 sm:flex dark:text-slate-200">
          <CalendarDays className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          {t("home.today", { date: today })}
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</p>
      ) : total === 0 ? (
        <div className={CARD}>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("home.noVehicles")}</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-4">
            {stats.map(({ to, label, value, sub, Icon, tone }) => {
              const body = (
                <div className="flex items-center gap-4">
                  <span className={`glass-bubble hidden h-14 w-14 shrink-0 items-center justify-center rounded-full sm:flex ${tone}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[13px] leading-tight font-semibold text-slate-700 sm:gap-2.5 sm:text-sm dark:text-slate-200">
                      {/* On a phone the pebble sits beside the label (there is no room for the big one at the side). */}
                      <span className={`glass-bubble flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:hidden ${tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      {label}
                    </p>
                    <p className="mt-1 text-4xl leading-none font-semibold tracking-tight text-slate-900 tabular-nums dark:text-white">{value}</p>
                    <p className="mt-1.5 truncate text-xs text-slate-500 sm:text-sm dark:text-slate-400">{sub}</p>
                  </div>
                </div>
              );
              // With nothing in it (no vehicle without signal, no alert) there is nothing to open: an empty map or list would only confuse.
              return value > 0 ? (
                <Link key={label} to={to} className={`${CARD} float-card block active:scale-[0.98]`}>
                  {body}
                </Link>
              ) : (
                <div key={label} className={`${CARD} cursor-default`}>
                  {body}
                </div>
              );
            })}
          </section>

          <div className="grid gap-5 lg:gap-6 xl:grid-cols-2 [&>section]:h-full">
            <section className={CARD}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                  <TitleIcon icon={ShieldCheck} />
                  {t("home.fleetState")}
                </h2>
                <Link to="/gps" className={LINK}>
                  {t("home.details")} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
                <FleetRing counts={summary.counts} total={total} label={t("home.vehicles")} />
                <ul className="w-full flex-1 divide-y divide-slate-200/70 dark:divide-white/10">
                  {(["moving", "stopped", "offline"] as const).map((status) => (
                    <li key={status} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: STATE_COLOR[status] }} />
                      <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">{t(`home.${status}`)}</span>
                      <span className="w-10 text-right text-lg font-semibold text-slate-900 tabular-nums dark:text-white">{summary.counts[status]}</span>
                      <span className={`min-w-14 rounded-full px-2.5 py-1 text-center text-xs font-bold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_10px_-6px_rgba(15,23,42,0.3)] ring-1 ring-white/80 dark:shadow-none dark:ring-white/10 ${SHARE_PILL[status]}`}>
                        {Math.round((summary.counts[status] / total) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className={CARD}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                  <TitleIcon icon={AlertTriangle} className="text-red-500" />
                  {t("home.needAttention")}
                </h2>
                <Link to="/alertas" className={LINK}>
                  {t("home.seeAll")} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {alerts.length === 0 ? (
                <p className="flex items-center gap-2 py-3 text-sm text-slate-500 dark:text-slate-400">
                  <CircleCheck className="h-5 w-5 text-emerald-500" /> {t("home.noAlerts")}
                </p>
              ) : (
                <ul className="divide-y divide-slate-200/70 dark:divide-white/10">
                  {alerts.slice(0, 4).map((alert, index) => (
                    <li key={`${alert.vehicleId}-${alert.type}-${index}`}>
                      <Link to={alert.link ?? "/alertas"} className="group flex items-center gap-3 py-3">
                        <span className="glass-bubble flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-amber-500">
                          <AlertTriangle className="h-[18px] w-[18px]" />
                        </span>
                        {/* The message already names the vehicle. */}
                        <span className="min-w-0 flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{alert.message}</span>
                        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className={CARD}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                <TitleIcon icon={MapPin} />
                {t("home.movingNow")}
              </h2>
              <Link to="/gps" className={LINK}>
                {t("home.openMap")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {summary.moving.length === 0 ? (
              <p className="py-2 text-sm text-slate-500 dark:text-slate-400">{t("home.noMovingNow")}</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3">
                {summary.moving.map((vehicle) => (
                  <li key={vehicle.id} className="flex items-center gap-3 rounded-2xl bg-white/50 px-3 py-2.5 dark:bg-white/5">
                    <span className="glass-bubble flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-700 dark:text-slate-200">
                      <Car className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{vehicle.name}</span>
                    <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                      <Gauge className="h-4 w-4" /> {vehicle.speed} km/h
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {shortcuts.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <TitleIcon icon={Zap} className="text-amber-500" />
            {t("home.shortcuts")}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
            {shortcuts.map(({ to, label, hint, icon: Icon }, index) => (
              <Link key={to} to={to} className={`${CARD} float-card group block p-4 active:scale-[0.98]`}>
                <span className={`glass-bubble flex h-11 w-11 items-center justify-center rounded-2xl ${SHORTCUT_TINTS[index % SHORTCUT_TINTS.length]}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="mt-3 flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{t(label)}</p>
                    {hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t(hint)}</p>}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** The fleet as a ring split by state, with the total in the middle, set in a glass dish. */
function FleetRing({ counts, total, label }: { counts: Record<VehicleStatus, number>; total: number; label: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const gap = total > 1 ? 3 : 0;
  let offset = 0;
  const arcs = (["moving", "stopped", "offline"] as const)
    .filter((status) => counts[status] > 0)
    .map((status) => {
      const length = (counts[status] / total) * circumference;
      const arc = { status, length: Math.max(length - gap, 0.01), offset };
      offset += length;
      return arc;
    });
  return (
    <div className="glass-bubble relative flex h-44 w-44 shrink-0 items-center justify-center rounded-full">
      <svg viewBox="0 0 128 128" className="absolute inset-2 -rotate-90" role="img" aria-label={`${total} ${label}`}>
        <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="13" className="text-slate-200/80 dark:text-white/10" />
        {arcs.map(({ status, length, offset: start }) => (
          <circle
            key={status}
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={STATE_COLOR[status]}
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={`${length} ${circumference}`}
            strokeDashoffset={-start}
          />
        ))}
      </svg>
      <div className="relative text-center">
        <p className="text-4xl leading-none font-semibold text-slate-900 tabular-nums dark:text-white">{total}</p>
        <p className="mt-1 text-sm text-slate-500 capitalize dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}
