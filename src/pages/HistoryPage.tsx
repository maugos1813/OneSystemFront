import { useEffect, useMemo, useState } from "react";
import { AreaFilterPills } from "../components/AreaFilterPills";
import { VehiclePicker } from "../components/VehiclePicker";
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

const RANGES: Array<{ label: string; hours: number }> = [
  { label: "24h", hours: 24 },
  { label: "3 días", hours: 24 * 3 },
  { label: "7 días", hours: 24 * 7 },
  { label: "15 días", hours: 24 * 15 },
  { label: "30 días", hours: 24 * 30 },
];

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

export function HistoryPage() {
  const { filteredVehicles: vehicles, loading: fleetLoading } = useFleet();
  // The vehicle panel on the map links here with ?vehicle=<id>.
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("vehicle"));
  const [rangeHours, setRangeHours] = useState(24);
  const [speedLimit, setSpeedLimit] = useState(DEFAULT_SPEED_LIMIT_KMH);

  useEffect(() => {
    if (vehicles.length === 0) return;
    if (!selectedVehicleId || !vehicles.some((v) => v.id === selectedVehicleId)) {
      setSelectedVehicleId(vehicles[0]!.id);
    }
  }, [selectedVehicleId, vehicles]);

  const from = useMemo(() => new Date(Date.now() - rangeHours * 60 * 60 * 1000), [rangeHours]);
  const { history, loading: historyLoading } = usePositionHistory(selectedVehicleId, from);

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
    getVehicleDriver(selectedVehicleId, { from })
      .then((d) => !cancelled && setDriver(d))
      .catch(() => undefined);
    getVehicleUsages(selectedVehicleId, { from, to: new Date() })
      .then((r) => !cancelled && setUsages(r.usages))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [canSeeDriver, selectedVehicleId, from]);

  const {
    playing,
    togglePlay,
    stop: handleStop,
    rate,
    setRate,
    index: currentIndex,
    position: currentPosition,
    seek: handleSeek,
  } = usePlayback(history, `${selectedVehicleId}|${rangeHours}`);
  const incidents = useVehicleIncidents(selectedVehicleId, Math.max(1, Math.round(rangeHours / 24)), speedLimit);
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

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0e1a]">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Historial de recorrido</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Reproducí el trayecto y mirá exactamente dónde se superaron los límites de velocidad.
      </p>

      <div className="mb-4">
        <AreaFilterPills />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <VehiclePicker vehicles={vehicles} selectedId={selectedVehicleId} onSelect={setSelectedVehicleId} />

        {vehicles.length > 0 && <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />}

        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRangeHours(r.hours)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              r.hours === rangeHours
                ? "bg-slate-900 text-white dark:bg-blue-600"
                : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-[#111729] dark:text-slate-400 dark:hover:bg-white/10"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

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
