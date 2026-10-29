import { useEffect, useMemo, useState } from "react";
import { AreaFilterPills } from "../components/AreaFilterPills";
import { VehiclePicker } from "../components/VehiclePicker";
import { Panel } from "../components/analytics/Panel";
import { HistoryMapView } from "../components/history/HistoryMapView";
import { PlaybackBar } from "../components/history/PlaybackBar";
import { SpeedTimelineChart } from "../components/history/SpeedTimelineChart";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { getVehicleDriver } from "../lib/api";
import type { VehicleDriver } from "../lib/types";
import { usePositionHistory } from "../hooks/usePositionHistory";
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
const PLAYBACK_TICK_MS = 80;
const PLAYBACK_STEPS = 300; // any route plays back fully in ~300 ticks, short or long

export function HistoryPage() {
  const { filteredVehicles: vehicles, loading: fleetLoading } = useFleet();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [rangeHours, setRangeHours] = useState(24);
  const [speedLimit, setSpeedLimit] = useState(DEFAULT_SPEED_LIMIT_KMH);
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

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
  useEffect(() => {
    setDriver(null);
    if (!canSeeDriver || !selectedVehicleId) return;
    let cancelled = false;
    getVehicleDriver(selectedVehicleId, { from })
      .then((d) => !cancelled && setDriver(d))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [canSeeDriver, selectedVehicleId, from]);

  useEffect(() => {
    setCurrentIndex(0);
    setPlaying(false);
  }, [selectedVehicleId, rangeHours]);

  useEffect(() => {
    if (!playing || history.length < 2) return;
    const step = Math.max(1, Math.ceil(history.length / PLAYBACK_STEPS));
    const interval = setInterval(() => {
      setCurrentIndex((i) => {
        const next = i + step;
        if (next >= history.length - 1) {
          setPlaying(false);
          return history.length - 1;
        }
        return next;
      });
    }, PLAYBACK_TICK_MS);
    return () => clearInterval(interval);
  }, [playing, history.length]);

  const currentPosition = history[currentIndex] ?? null;
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
    handleSeek(index === -1 ? history.length - 1 : index);
    setPlaying(false);
  }
  const vehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  function handleSeek(index: number) {
    setCurrentIndex(Math.max(0, Math.min(index, history.length - 1)));
  }

  function handleStop() {
    setPlaying(false);
    setCurrentIndex(0);
  }

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

      {driver?.driver && (
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
                onTogglePlay={() => setPlaying((p) => !p)}
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
