import { useEffect, useMemo, useState } from "react";
import { Panel } from "../components/analytics/Panel";
import { IncidentList } from "../components/driving/IncidentList";
import { IncidentMap } from "../components/driving/IncidentMap";
import { ScoreRing } from "../components/driving/ScoreRing";
import { useFleet } from "../context/FleetContext";
import { usePositionHistory } from "../hooks/usePositionHistory";
import {
  computeCategoryScores,
  computeIncidents,
  INCIDENT_LABELS,
  type CategoryCounts,
  type IncidentType,
} from "../lib/drivingBehavior";

const RANGES: Array<{ label: string; hours: number }> = [
  { label: "24h", hours: 24 },
  { label: "7 días", hours: 24 * 7 },
  { label: "30 días", hours: 24 * 30 },
];

const CATEGORY_ORDER: Array<keyof CategoryCounts> = [
  "harshBraking",
  "harshAcceleration",
  "harshCornering",
  "speeding",
];

const DEFAULT_SPEED_LIMIT_KMH = 120;

type Selection = "overall" | IncidentType;

export function DrivingBehaviorPage() {
  const { vehicles, loading: fleetLoading } = useFleet();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [rangeHours, setRangeHours] = useState(24 * 7);
  const [speedLimit, setSpeedLimit] = useState(DEFAULT_SPEED_LIMIT_KMH);
  const [selection, setSelection] = useState<Selection>("overall");
  const [activeIncidentIndex, setActiveIncidentIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedVehicleId && vehicles.length > 0) setSelectedVehicleId(vehicles[0]!.id);
  }, [selectedVehicleId, vehicles]);

  const from = useMemo(() => new Date(Date.now() - rangeHours * 60 * 60 * 1000), [rangeHours]);
  const { history, loading: historyLoading } = usePositionHistory(selectedVehicleId, from);

  useEffect(() => {
    setSelection("overall");
    setActiveIncidentIndex(null);
  }, [selectedVehicleId, rangeHours]);

  useEffect(() => {
    setActiveIncidentIndex(null);
  }, [selection, speedLimit]);

  const incidents = useMemo(() => computeIncidents(history, speedLimit), [history, speedLimit]);
  const scores = useMemo(() => computeCategoryScores(incidents), [incidents]);
  const visibleIncidents = useMemo(
    () => (selection === "overall" ? incidents : incidents.filter((i) => i.type === selection)),
    [incidents, selection],
  );

  const vehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  const loading = fleetLoading || historyLoading;

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900">Conducción</h1>
      <p className="mb-6 text-sm text-slate-500">
        Puntaje de manejo por vehículo — hacé click en cualquier puntaje para ver dónde y cuándo pasó cada
        incidente.
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
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
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

        <span className="mx-1 h-5 w-px bg-slate-200" />

        <label className="flex items-center gap-2 text-sm text-slate-500">
          Límite de velocidad
          <input
            type="number"
            min={10}
            max={300}
            value={speedLimit}
            onChange={(e) => setSpeedLimit(Number(e.target.value) || 0)}
            className="field-input w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
          />
          km/h
        </label>
      </div>

      {!fleetLoading && vehicles.length === 0 && (
        <p className="text-sm text-slate-500">Todavía no hay vehículos cargados.</p>
      )}

      {vehicle && loading && <p className="text-sm text-slate-500">Calculando puntajes...</p>}

      {vehicle && !loading && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            <ScoreRing
              label="General"
              score={scores.overall}
              count={incidents.length}
              countLabel="incidentes en total"
              active={selection === "overall"}
              onClick={() => setSelection("overall")}
            />
            {CATEGORY_ORDER.map((key) => (
              <ScoreRing
                key={key}
                label={INCIDENT_LABELS[key]}
                score={scores[key]}
                count={scores.counts[key]}
                countLabel="eventos"
                active={selection === key}
                onClick={() => setSelection(key)}
              />
            ))}
          </div>

          <Panel title={selection === "overall" ? "Todos los incidentes" : INCIDENT_LABELS[selection]}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
              <div className="h-72 overflow-hidden rounded-2xl sm:h-80">
                <IncidentMap incidents={visibleIncidents} activeIndex={activeIncidentIndex} />
              </div>
              <IncidentList
                incidents={visibleIncidents}
                activeIndex={activeIncidentIndex}
                onSelect={setActiveIncidentIndex}
              />
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
