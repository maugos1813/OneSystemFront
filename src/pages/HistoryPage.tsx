import { ArrowLeft, CalendarDays, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AreaFilterPills } from "../components/AreaFilterPills";
import { VehicleStatusBadge } from "../components/StatusBadge";
import { Panel } from "../components/analytics/Panel";
import { HistoryMapView } from "../components/history/HistoryMapView";
import { PlaybackBar } from "../components/history/PlaybackBar";
import { SpeedTimelineChart } from "../components/history/SpeedTimelineChart";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { getVehicleDriver, getVehicleUsages } from "../lib/api";
import type { VehicleDriver, VehicleUsage } from "../lib/types";
import { usePositionHistory } from "../hooks/usePositionHistory";
import { usePlayback } from "../hooks/usePlayback";
import { useVehicleIncidents } from "../hooks/useVehicleIncidents";
import { INCIDENT_COLORS, INCIDENT_LABELS, type Incident, type IncidentType } from "../lib/drivingBehavior";
import { incidentPinUrl } from "../lib/incidentPins";
import { isIdling, matchesSearch, thresholdsFromSettings, vehicleStatus } from "../lib/vehicleStatus";

const RANGES: Array<{ label: string; hours: number }> = [
  { label: "24h", hours: 24 },
  { label: "3 días", hours: 24 * 3 },
  { label: "7 días", hours: 24 * 7 },
  { label: "30 días", hours: 24 * 30 },
  { label: "3 meses", hours: 24 * 91 },
  { label: "6 meses", hours: 24 * 182 },
];

/** A route is kept for 6 months. */
const HISTORY_DAYS = 183;
/** The server works out driving incidents, and who drove, over 31 days at most. */
const INCIDENT_DAYS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;

type Range = { kind: "preset"; hours: number } | { kind: "custom"; fromDay: string; toDay: string };

/** yyyy-mm-dd of a moment, in the person's own day (what a date field holds). */
function dayString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const SHORT_DAY = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit" });

const INCIDENT_TYPES: IncidentType[] = ["harshBraking", "harshAcceleration", "harshCornering", "speeding"];
const DEFAULT_SPEED_LIMIT_KMH = 120;

const USAGE_TIME = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** "28/10 06:00 – 13:10", or "desde 28/10 06:00" when the Driver has no end time. */
function formatUsageWindow(u: VehicleUsage): string {
  const from = USAGE_TIME.format(new Date(u.from));
  if (!u.to) return `desde ${from}`;
  const to = USAGE_TIME.format(new Date(u.to));
  // Same day: show the end time only.
  return `${from} – ${from.slice(0, 5) === to.slice(0, 5) ? to.slice(-5) : to}`;
}

/** The first step: which vehicle. Everything else on the page is about the one chosen here. */
function ChooseVehicle({ onSelect }: { onSelect: (vehicleId: string) => void }) {
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
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Historial de recorrido</h1>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">Elige el vehículo del que quieres ver el recorrido.</p>

        <div className="mb-4">
          <AreaFilterPills />
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por placa o nombre…"
            aria-label="Buscar vehículo"
            className="field-input w-full rounded-xl border border-slate-300 py-2.5 pr-3 pl-9 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        {vehicles.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no hay vehículos.</p>}
        {vehicles.length > 0 && shown.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Ningún vehículo coincide.</p>}

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

export function HistoryPage() {
  const { filteredVehicles: vehicles, loading: fleetLoading } = useFleet();
  // The vehicle is chosen first and lives in the address (?vehicle=<id>): the map's vehicle panel links here with it, and the Back
  // button returns to the list of vehicles.
  const [params, setParams] = useSearchParams();
  const wanted = params.get("vehicle");
  const selectedVehicleId = wanted && vehicles.some((v) => v.id === wanted) ? wanted : null;
  const selectVehicle = (id: string | null) => setParams(id ? { vehicle: id } : {});
  const [range, setRange] = useState<Range>({ kind: "preset", hours: 24 });
  const [choosingDates, setChoosingDates] = useState(false);
  const [draftFrom, setDraftFrom] = useState(() => dayString(new Date(Date.now() - DAY_MS)));
  const [draftTo, setDraftTo] = useState(() => dayString(new Date()));
  const [speedLimit, setSpeedLimit] = useState(DEFAULT_SPEED_LIMIT_KMH);

  // The period as moments: a preset ends now; chosen days run from the start of the first to the end of the last (never past now).
  const { from, to, rangeKey } = useMemo(() => {
    if (range.kind === "preset") {
      return { from: new Date(Date.now() - range.hours * 60 * 60 * 1000), to: null as Date | null, rangeKey: `p${range.hours}` };
    }
    const end = new Date(`${range.toDay}T23:59:59.999`);
    return { from: new Date(`${range.fromDay}T00:00:00`), to: end.getTime() > Date.now() ? null : end, rangeKey: `c${range.fromDay}_${range.toDay}` };
  }, [range]);
  const oldest = dayString(new Date(Date.now() - HISTORY_DAYS * DAY_MS));
  const today = dayString(new Date());
  const datesValid = draftFrom !== "" && draftTo !== "" && draftFrom <= draftTo && draftFrom >= oldest && draftTo <= today;
  const { history, loading: historyLoading } = usePositionHistory(selectedVehicleId, from, to);

  // Who drove it in this period (from the drivers' beacons); needs the Conducción section.
  const { currentUser } = useAuth();
  const canSeeDriver =
    currentUser?.role === "owner" ||
    currentUser?.role === "admin" ||
    !!currentUser?.modules.some((m) => m === "conduccion");
  const [driver, setDriver] = useState<VehicleDriver | null>(null);
  // Who Gamonal Driver gave the vehicle to in the period: several drivers can have used it, and this is the exact record.
  const [usages, setUsages] = useState<VehicleUsage[]>([]);
  useEffect(() => {
    setDriver(null);
    setUsages([]);
    if (!canSeeDriver || !selectedVehicleId) return;
    let cancelled = false;
    // The server answers who drove over 31 days at most (93 for the services): a longer period asks for its last stretch.
    const end = to ?? new Date();
    const driverFrom = new Date(Math.max(from.getTime(), end.getTime() - INCIDENT_DAYS * DAY_MS));
    const usagesFrom = new Date(Math.max(from.getTime(), end.getTime() - 92 * DAY_MS));
    getVehicleDriver(selectedVehicleId, { from: driverFrom, to: end })
      .then((d) => !cancelled && setDriver(d))
      .catch(() => undefined);
    getVehicleUsages(selectedVehicleId, { from: usagesFrom, to: end })
      .then((r) => !cancelled && setUsages(r.usages))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [canSeeDriver, selectedVehicleId, from, to]);

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
  // Driving incidents are worked out by the server over the last 31 days; those of a chosen period are the ones inside it.
  const incidentDays = Math.min(INCIDENT_DAYS, Math.max(1, Math.ceil((Date.now() - from.getTime()) / DAY_MS)));
  const allIncidents = useVehicleIncidents(selectedVehicleId, incidentDays, speedLimit);
  const incidents = useMemo(() => {
    const start = from.getTime();
    const end = to ? to.getTime() : Infinity;
    return allIncidents.filter((i) => {
      const at = new Date(i.ts).getTime();
      return at >= start && at <= end;
    });
  }, [allIncidents, from, to]);
  const incidentsCoverPeriod = Date.now() - from.getTime() <= INCIDENT_DAYS * DAY_MS;
  const [hiddenTypes, setHiddenTypes] = useState<ReadonlySet<IncidentType>>(new Set());
  const shownIncidents = useMemo(() => incidents.filter((i) => !hiddenTypes.has(i.type)), [incidents, hiddenTypes]);
  const countByType = useMemo(() => {
    const counts: Record<IncidentType, number> = {
      harshBraking: 0,
      harshAcceleration: 0,
      harshCornering: 0,
      speeding: 0,
    };
    for (const i of incidents) counts[i.type] += 1;
    return counts;
  }, [incidents]);

  function toggleType(type: IncidentType) {
    setHiddenTypes((current) => {
      const next = new Set(current);
      if (!next.delete(type)) next.add(type);
      return next;
    });
  }

  /** Playback jumps to the first report at or after the moment of the event. */
  function handleIncidentSelect(incident: Incident) {
    const at = new Date(incident.ts).getTime();
    const index = history.findIndex((p) => new Date(p.ts).getTime() >= at);
    if (playing) togglePlay();
    handleSeek(index === -1 ? history.length - 1 : index);
  }

  const vehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  if (fleetLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">Cargando...</div>
    );
  }

  if (!selectedVehicleId) return <ChooseVehicle onSelect={selectVehicle} />;

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0e1a]">
      {/* The vehicle is already chosen: no list of fleets or plates here, just which one it is and a way back to choose another. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => selectVehicle(null)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:bg-[#111729] dark:text-slate-200 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Vehículos
        </button>
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-lg leading-tight font-semibold text-slate-900 dark:text-white">
            {vehicle?.plate ?? vehicle?.name}
            {vehicle?.fleetGroup && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                {vehicle.fleetGroup}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Historial de recorrido</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {RANGES.map((r) => {
            const active = range.kind === "preset" && range.hours === r.hours;
            return (
              <button
                key={r.label}
                onClick={() => {
                  setRange({ kind: "preset", hours: r.hours });
                  setChoosingDates(false);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active ? "bg-slate-900 text-white dark:bg-blue-600" : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-[#111729] dark:text-slate-400 dark:hover:bg-white/10"
                }`}
              >
                {r.label}
              </button>
            );
          })}
          <button
            onClick={() => setChoosingDates((open) => !open)}
            aria-expanded={choosingDates}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              range.kind === "custom" || choosingDates ? "bg-slate-900 text-white dark:bg-blue-600" : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-[#111729] dark:text-slate-400 dark:hover:bg-white/10"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {range.kind === "custom"
              ? range.fromDay === range.toDay
                ? SHORT_DAY.format(new Date(`${range.fromDay}T12:00:00`))
                : `${SHORT_DAY.format(new Date(`${range.fromDay}T12:00:00`))} – ${SHORT_DAY.format(new Date(`${range.toDay}T12:00:00`))}`
              : "Elegir fechas"}
          </button>
        </div>
      </div>

      {choosingDates && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Desde
            <input
              type="date"
              value={draftFrom}
              min={oldest}
              max={today}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="field-input mt-1 block rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Hasta
            <input
              type="date"
              value={draftTo}
              min={oldest}
              max={today}
              onChange={(e) => setDraftTo(e.target.value)}
              className="field-input mt-1 block rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </label>
          <button
            disabled={!datesValid}
            onClick={() => {
              setRange({ kind: "custom", fromDay: draftFrom, toDay: draftTo });
              setChoosingDates(false);
            }}
            className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Ver recorrido
          </button>
          <p className="basis-full text-xs text-slate-500 dark:text-slate-400">
            Los recorridos se guardan 6 meses: puedes elegir cualquier día desde el {SHORT_DAY.format(new Date(`${oldest}T12:00:00`))}. Un mismo día en
            «Desde» y «Hasta» muestra solo ese día. De un equipo recién instalado hay recorrido desde que empezó a reportar.
          </p>
        </div>
      )}
      {!incidentsCoverPeriod && (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          Las frenadas, aceleraciones, curvas y excesos de velocidad se marcan en los últimos {INCIDENT_DAYS} días; el recorrido se ve completo.
        </p>
      )}

      {usages.length > 0 && (
        <div className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          <p className="mb-1 font-medium text-slate-800 dark:text-slate-100">
            Quién lo usó <span className="text-xs font-normal text-slate-400">(servicios de Gamonal Driver)</span>
          </p>
          <ul className="max-h-40 space-y-0.5 overflow-y-auto">
            {usages.map((u, i) => (
              <li key={`${u.from}:${i}`}>
                <strong>{u.driver.name}</strong>
                <span className="text-slate-400">
                  {" · "}
                  {formatUsageWindow(u)}
                  {!u.declared && " (horario estimado)"}
                  {u.switched && " · cambió de furgón"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {usages.length === 0 && driver?.driver && (
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Conductor: <strong>{driver.driver.name}</strong>
          {driver.confidence === "low" && " (probable)"}
          {driver.others.length > 0 && (
            <span className="text-slate-400"> · también en cabina: {driver.others.map((o) => o.name).join(", ")}</span>
          )}
        </p>
      )}

      {!vehicle && <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no hay vehículos cargados.</p>}

      {vehicle && historyLoading && (
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Cargando recorrido...</p>
      )}

      {vehicle && !historyLoading && history.length < 2 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No hay suficientes datos en este rango para reproducir el recorrido.
        </p>
      )}

      {/* While another route loads, the previous one stays on screen, dimmed: unmounting the map would create a new one
          (a new, billed load) for every change of vehicle or period. */}
      {vehicle && history.length >= 2 && (
        <div
          className={`grid grid-cols-1 gap-4 transition-opacity lg:grid-cols-3 ${historyLoading ? "pointer-events-none opacity-50" : ""}`}
        >
          <Panel title="Mapa del recorrido" className="lg:col-span-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {INCIDENT_TYPES.map((type) => {
                const hidden = hiddenTypes.has(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    aria-pressed={!hidden}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      hidden
                        ? "border-slate-200 bg-transparent text-slate-400 line-through dark:border-white/10 dark:text-slate-500"
                        : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                    }`}
                    style={hidden ? undefined : { borderColor: `${INCIDENT_COLORS[type]}66` }}
                  >
                    <img src={incidentPinUrl(type)} alt="" className={`h-5 w-4 ${hidden ? "opacity-40" : ""}`} />
                    {INCIDENT_LABELS[type]}
                    <span className="tabular-nums opacity-70">{countByType[type]}</span>
                  </button>
                );
              })}
            </div>
            <div className="h-80 overflow-hidden rounded-2xl sm:h-[28rem]">
              <HistoryMapView
                positions={history}
                currentPosition={currentPosition}
                currentIndex={currentIndex}
                speedLimit={speedLimit}
                incidents={shownIncidents}
                onIncidentSelect={handleIncidentSelect}
              />
            </div>
          </Panel>

          <Panel title="Velocidad" className="lg:col-span-3">
            <SpeedTimelineChart
              positions={history}
              speedLimit={speedLimit}
              currentIndex={currentIndex}
              onSeek={handleSeek}
            />
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/10">
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
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
