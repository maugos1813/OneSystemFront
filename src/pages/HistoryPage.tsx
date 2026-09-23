import { useEffect, useMemo, useState } from "react";
import { Panel } from "../components/analytics/Panel";
import { HistoryMapView } from "../components/history/HistoryMapView";
import { PlaybackBar } from "../components/history/PlaybackBar";
import { SpeedTimelineChart } from "../components/history/SpeedTimelineChart";
import { ViolationsList } from "../components/history/ViolationsList";
import { useFleet } from "../context/FleetContext";
import { usePositionHistory } from "../hooks/usePositionHistory";
import { findSpeedViolations } from "../lib/speedTimeline";

const RANGES: Array<{ label: string; hours: number }> = [
  { label: "24h", hours: 24 },
  { label: "3 días", hours: 24 * 3 },
  { label: "7 días", hours: 24 * 7 },
];

const DEFAULT_SPEED_LIMIT_KMH = 120;
const PLAYBACK_TICK_MS = 80;
const PLAYBACK_STEPS = 300; // any route plays back fully in ~300 ticks, short or long

export function HistoryPage() {
  const { vehicles, loading: fleetLoading } = useFleet();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [rangeHours, setRangeHours] = useState(24);
  const [speedLimit, setSpeedLimit] = useState(DEFAULT_SPEED_LIMIT_KMH);
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!selectedVehicleId && vehicles.length > 0) setSelectedVehicleId(vehicles[0]!.id);
  }, [selectedVehicleId, vehicles]);

  const from = useMemo(() => new Date(Date.now() - rangeHours * 60 * 60 * 1000), [rangeHours]);
  const { history, loading: historyLoading } = usePositionHistory(selectedVehicleId, from);

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
  const violations = useMemo(() => findSpeedViolations(history, speedLimit), [history, speedLimit]);
  const vehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  function handleSeek(index: number) {
    setCurrentIndex(Math.max(0, Math.min(index, history.length - 1)));
  }

  function handleStop() {
    setPlaying(false);
    setCurrentIndex(0);
  }

  if (fleetLoading) {
    return <div className="flex h-full items-center justify-center text-slate-500">Cargando...</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900">Historial de recorrido</h1>
      <p className="mb-6 text-sm text-slate-500">
        Reproducí el trayecto y mirá exactamente dónde se superaron los límites de velocidad.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {vehicles.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedVehicleId(v.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              v.id === selectedVehicleId ? "brand-button" : "bg-white text-slate-500 hover:bg-violet-50"
            }`}
          >
            {v.name}
          </button>
        ))}

        {vehicles.length > 0 && <span className="mx-1 h-5 w-px bg-slate-200" />}

        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRangeHours(r.hours)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              r.hours === rangeHours ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-100"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!vehicle && <p className="text-sm text-slate-500">Todavía no hay vehículos cargados.</p>}

      {vehicle && historyLoading && <p className="text-sm text-slate-500">Cargando recorrido...</p>}

      {vehicle && !historyLoading && history.length < 2 && (
        <p className="text-sm text-slate-500">No hay suficientes datos en este rango para reproducir el recorrido.</p>
      )}

      {vehicle && !historyLoading && history.length >= 2 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Mapa del recorrido" className="lg:col-span-2">
            <div className="h-72 overflow-hidden rounded-2xl sm:h-80">
              <HistoryMapView positions={history} currentPosition={currentPosition} speedLimit={speedLimit} />
            </div>
          </Panel>

          <Panel title={`Excesos de velocidad (${violations.length})`}>
            <ViolationsList violations={violations} activeIndex={currentIndex} onSelect={handleSeek} />
          </Panel>

          <Panel title="Velocidad" className="lg:col-span-3">
            <SpeedTimelineChart
              positions={history}
              speedLimit={speedLimit}
              currentIndex={currentIndex}
              onSeek={handleSeek}
            />
            <div className="mt-4 border-t border-slate-100 pt-4">
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
