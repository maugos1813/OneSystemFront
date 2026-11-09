import { ArrowLeft, CalendarDays, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AreaFilterPills } from "../components/AreaFilterPills";
import { VehicleStatusBadge } from "../components/StatusBadge";
import { HistoryMapView } from "../components/history/HistoryMapView";
import { RangeCalendar, addDays, dayOf, type Day } from "../components/history/RangeCalendar";
import { PlaybackBar } from "../components/history/PlaybackBar";
import { routeSummary } from "../lib/routeSummary";
import { useInAppFullscreen } from "../hooks/useInAppFullscreen";
import { SpeedTimelineChart } from "../components/history/SpeedTimelineChart";
import { useFleet } from "../context/FleetContext";
import { useLanguage, type MessageKey } from "../i18n";
import { usePositionHistory } from "../hooks/usePositionHistory";
import { usePlayback } from "../hooks/usePlayback";
import { isIdling, matchesSearch, thresholdsFromSettings, vehicleStatus } from "../lib/vehicleStatus";

/** A route is kept for 6 months. */
const HISTORY_DAYS = 183;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Day formats in the language of the screen ("12/11" and "12 novembre 2026"). */
function dayFormats(locale: string) {
  return {
    short: new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }),
    long: new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }),
  };
}

const isDay = (value: string | null): value is Day => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
const dayLabel = (fromDay: Day, toDay: Day, locale: string) => {
  const { short, long } = dayFormats(locale);
  return fromDay === toDay ? long.format(new Date(`${fromDay}T12:00:00`)) : `${short.format(new Date(`${fromDay}T12:00:00`))} – ${short.format(new Date(`${toDay}T12:00:00`))}`;
};

const DEFAULT_SPEED_LIMIT_KMH = 120;

/** The first step: which vehicle. Everything else on the page is about the one chosen here. */
function ChooseVehicle({ onSelect }: { onSelect: (vehicleId: string) => void }) {
  const { t } = useLanguage();
  const { filteredVehicles: vehicles, devices, positions, settings } = useFleet();
  const [search, setSearch] = useState("");
  const thresholds = thresholdsFromSettings(settings);
  const seen = new Map(devices.map((d) => [d.id, d.lastSeenAt]));
  const shown = vehicles
    .filter((v) => matchesSearch(search, v.plate, v.name, v.fleetGroup))
    .sort((a, b) => (a.plate ?? a.name).localeCompare(b.plate ?? b.name));

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0e1a]">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("history.title")}</h1>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{t("history.chooseVehicle")}</p>

        <div className="mb-4">
          <AreaFilterPills />
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("history.search")}
            aria-label={t("history.searchLabel")}
            className="field-input w-full rounded-xl border border-slate-300 py-2.5 pr-3 pl-9 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        {vehicles.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{t("history.noVehicles")}</p>}
        {vehicles.length > 0 && shown.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{t("history.noMatch")}</p>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((v) => {
            const position = positions[v.id];
            const status = vehicleStatus(position, v.deviceId ? (seen.get(v.deviceId) ?? null) : null, thresholds);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelect(v.id)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white p-4 text-left shadow-lg shadow-slate-200/50 transition hover:border-blue-300 active:scale-[0.99] dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold text-slate-900 dark:text-white">{v.plate ?? v.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    {v.plate && v.name !== v.plate && <span className="truncate text-xs text-slate-500 dark:text-slate-400">{v.name}</span>}
                    {v.fleetGroup && (
                      <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                        {v.fleetGroup}
                      </span>
                    )}
                  </span>
                </span>
                <VehicleStatusBadge status={status} idling={isIdling(position)} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The last step: the route of one vehicle over the chosen days. */
function HistoryView({
  vehicleId: selectedVehicleId,
  fromDay,
  toDay,
  onChangeVehicle,
  onChangeDates,
}: {
  vehicleId: string;
  fromDay: Day;
  toDay: Day;
  onChangeVehicle: () => void;
  onChangeDates: () => void;
}) {
  const { t, locale } = useLanguage();
  const { filteredVehicles: vehicles, loading: fleetLoading } = useFleet();
  const [speedLimit, setSpeedLimit] = useState(DEFAULT_SPEED_LIMIT_KMH);

  // The period as moments: from the start of the first day to the end of the last (never past now).
  const { from, to, rangeKey } = useMemo(() => {
    const end = new Date(`${toDay}T23:59:59.999`);
    return { from: new Date(`${fromDay}T00:00:00`), to: end.getTime() > Date.now() ? null : end, rangeKey: `${fromDay}_${toDay}` };
  }, [fromDay, toDay]);
  const { history, loading: historyLoading } = usePositionHistory(selectedVehicleId, from, to);

  const {
    playing,
    togglePlay,
    stop: handleStop,
    rate,
    setRate,
    index: currentIndex,
    position: currentPosition,
    seek: handleSeek,
  } = usePlayback(history, `${selectedVehicleId}|${rangeKey}`);
  const vehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  if (fleetLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">{t("common.loading")}</div>
    );
  }

  const [mapFull, toggleMapFull] = useInAppFullscreen();
  const summary = useMemo(() => routeSummary(history), [history]);
  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const dayTime = (iso: string) => new Date(iso).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  // The route fills the screen: a slim header, then the map taking all the room that is left and the controls beside it (laptop) or
  // right under it (phone), where the page scrolls to the rest. No panels, titles or margins around the map.
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#f5f6fb] lg:overflow-hidden dark:bg-[#0a0e1a]">
      {/* The vehicle is already chosen: no list of fleets or plates here, just which one it is and a way back to choose another. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-3 pt-3 sm:px-4 lg:px-5">
        <button
          type="button"
          onClick={onChangeVehicle}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:bg-[#111729] dark:text-slate-200 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("history.vehicles")}
        </button>
        <h1 className="flex min-w-0 flex-wrap items-center gap-2 text-lg leading-tight font-semibold text-slate-900 dark:text-white">
          {vehicle?.plate ?? vehicle?.name}
          {vehicle?.fleetGroup && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">{vehicle.fleetGroup}</span>
          )}
        </h1>
        <button
          type="button"
          onClick={onChangeDates}
          className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 sm:ml-auto dark:bg-[#111729] dark:text-slate-200 dark:hover:bg-white/10"
        >
          <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          {dayLabel(fromDay, toDay, locale)}
          <span className="text-xs font-normal text-blue-600 dark:text-blue-400">{t("history.change")}</span>
        </button>
      </div>

      {!vehicle && <p className="px-4 pt-3 text-sm text-slate-500 dark:text-slate-400">{t("history.noneLoaded")}</p>}

      {vehicle && historyLoading && history.length < 2 && <p className="px-4 pt-3 text-sm text-slate-500 dark:text-slate-400">{t("history.loadingRoute")}</p>}

      {vehicle && !historyLoading && history.length < 2 && (
        <p className="px-4 pt-3 text-sm text-slate-500 dark:text-slate-400">{t("history.notEnough")}</p>
      )}

      {/* While another route loads, the previous one stays on screen, dimmed: unmounting the map would create a new one
          (a new, billed load) for every change of vehicle or period. */}
      {vehicle && history.length >= 2 && (
        <div className={`flex min-h-0 flex-1 flex-col gap-3 p-3 transition-opacity sm:p-4 lg:flex-row lg:p-5 ${historyLoading ? "pointer-events-none opacity-50" : ""}`}>
          <div
            className={
              mapFull
                ? "fixed inset-0 z-[60] overflow-hidden bg-slate-100 dark:bg-[#0a0e1a]"
                : "h-[56vh] min-h-72 shrink-0 overflow-hidden rounded-3xl shadow-lg shadow-slate-300/40 lg:h-auto lg:min-h-0 lg:flex-1 dark:shadow-black/40"
            }
          >
            <HistoryMapView
              positions={history}
              currentPosition={currentPosition}
              currentIndex={currentIndex}
              speedLimit={speedLimit}
              fullscreen={mapFull}
              onToggleFullscreen={toggleMapFull}
            />
          </div>

          <aside className="flex shrink-0 flex-col gap-3 lg:w-[23rem] lg:overflow-y-auto xl:w-[26rem]">
            {summary && (
              <section className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-3xl bg-white p-4 shadow-lg shadow-slate-200/50 dark:bg-[#111729] dark:shadow-black/40">
                <div>
                  <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">{t("history.start")}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{fromDay === toDay ? time(summary.start) : dayTime(summary.start)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">{t("history.end")}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{fromDay === toDay ? time(summary.end) : dayTime(summary.end)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">{t("history.distance")}</p>
                  <p className="text-sm font-semibold text-slate-900 tabular-nums dark:text-white">{summary.distanceKm.toFixed(1)} km</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">{t("history.speed")}</p>
                  <p className="text-sm font-semibold text-slate-900 tabular-nums dark:text-white">
                    {t("history.speedSummary", { max: summary.maxSpeed, avg: summary.avgSpeed })} <span className="font-normal text-slate-400">km/h</span>
                  </p>
                </div>
              </section>
            )}

            <section className="rounded-3xl bg-white p-4 shadow-lg shadow-slate-200/50 dark:bg-[#111729] dark:shadow-black/40">
              <PlaybackBar
                playing={playing}
                onTogglePlay={togglePlay}
                rate={rate}
                onRateChange={setRate}
                onStop={handleStop}
                currentIndex={currentIndex}
                total={history.length}
                onSeek={handleSeek}
                currentSpeed={currentPosition?.speed ?? 0}
                speedLimit={speedLimit}
                onSpeedLimitChange={setSpeedLimit}
                currentTs={currentPosition?.ts ?? null}
              />
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-lg shadow-slate-200/50 dark:bg-[#111729] dark:shadow-black/40">
              <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t("history.speed")}</h2>
              <SpeedTimelineChart positions={history} speedLimit={speedLimit} currentIndex={currentIndex} onSeek={handleSeek} />
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

/** Quick ways in, so the usual periods are one tap: each goes straight to the route. */
const QUICK_PERIODS: Array<{ label: MessageKey; days: number; yesterday?: boolean }> = [
  { label: "history.today", days: 1 },
  { label: "history.yesterday", days: 1, yesterday: true },
  { label: "history.last7", days: 7 },
  { label: "history.last30", days: 30 },
  { label: "history.last3m", days: 91 },
  { label: "history.last6m", days: 182 },
];

/** The second step: which days. A calendar, with the usual periods one tap away. */
function ChooseDates({
  vehicleLabel,
  fleet,
  onBack,
  onPick,
}: {
  vehicleLabel: string;
  fleet: string | null;
  onBack: () => void;
  onPick: (fromDay: Day, toDay: Day) => void;
}) {
  const { t, locale } = useLanguage();
  const today = dayOf(new Date());
  const oldest = dayOf(new Date(Date.now() - HISTORY_DAYS * DAY_MS));
  const [start, setStart] = useState<Day | null>(null);
  const [end, setEnd] = useState<Day | null>(null);
  const last = end ?? start;
  const days = start && last ? Math.round((new Date(`${last}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / DAY_MS) + 1 : 0;

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0e1a]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:bg-[#111729] dark:text-slate-200 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("history.vehicles")}
          </button>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-lg leading-tight font-semibold text-slate-900 dark:text-white">
              {vehicleLabel}
              {fleet && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">{fleet}</span>}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("history.whichDays")}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {QUICK_PERIODS.map(({ label, days: length, yesterday }) => (
            <button
              key={label}
              type="button"
              onClick={() => (yesterday ? onPick(addDays(today, -1), addDays(today, -1)) : onPick(addDays(today, -(length - 1)), today))}
              className="rounded-full bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-95 dark:bg-[#111729] dark:text-slate-200 dark:hover:bg-white/10"
            >
              {t(label)}
            </button>
          ))}
        </div>

        <div className="rounded-3xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 sm:p-6 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <RangeCalendar
            min={oldest}
            max={today}
            start={start}
            end={end}
            onChange={(a, b) => {
              setStart(a);
              setEnd(b);
            }}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {start && last
                ? t("history.daysCount", { range: dayLabel(start, last, locale), count: days })
                : t("history.tapHint")}
            </p>
            <button
              type="button"
              disabled={!start}
              onClick={() => start && onPick(start, last ?? start)}
              className="brand-button rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {t("history.viewRoute")}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {t("history.kept")}
        </p>
      </div>
    </div>
  );
}

/** Historial: first the vehicle, then the days, then the route. Each step is in the address, so Back goes to the one before. */
export function HistoryPage() {
  const { t } = useLanguage();
  const { filteredVehicles: vehicles, loading } = useFleet();
  const [params, setSearchParams] = useSearchParams();
  // The step is in the address, but so is the view of the Veicoli hub this page sits in (?tab=storico): keep it, or the next step lands back on the hub's cards.
  const hubTab = params.get("tab");
  const setParams = (next: Record<string, string>) => setSearchParams(hubTab ? { tab: hubTab, ...next } : next);

  if (loading) return <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">{t("common.loading")}</div>;

  const wanted = params.get("vehicle");
  const vehicle = wanted ? (vehicles.find((v) => v.id === wanted) ?? null) : null;
  if (!vehicle) return <ChooseVehicle onSelect={(id) => setParams({ vehicle: id })} />;

  const fromDay = params.get("desde");
  const toDay = params.get("hasta");
  const oldest = dayOf(new Date(Date.now() - HISTORY_DAYS * DAY_MS));
  const today = dayOf(new Date());
  if (!isDay(fromDay) || !isDay(toDay) || fromDay > toDay || fromDay < oldest || toDay > today) {
    return (
      <ChooseDates
        vehicleLabel={vehicle.plate ?? vehicle.name}
        fleet={vehicle.fleetGroup}
        onBack={() => setParams({})}
        onPick={(a, b) => setParams({ vehicle: vehicle.id, desde: a, hasta: b })}
      />
    );
  }

  return (
    <HistoryView
      vehicleId={vehicle.id}
      fromDay={fromDay}
      toDay={toDay}
      onChangeVehicle={() => setParams({})}
      onChangeDates={() => setParams({ vehicle: vehicle.id })}
    />
  );
}
