import { useMemo, useState } from "react";
import { VehicleScoreCard } from "../components/driving/VehicleScoreCard";
import { useFleet } from "../context/FleetContext";
import { useFleetPositionHistory } from "../hooks/useFleetPositionHistory";
import { computeCategoryScores } from "../lib/drivingBehavior";

const RANGES: Array<{ label: string; hours: number }> = [
  { label: "24h", hours: 24 },
  { label: "7 días", hours: 24 * 7 },
  { label: "30 días", hours: 24 * 30 },
];

const DEFAULT_SPEED_LIMIT_KMH = 120;

export function DrivingBehaviorPage() {
  const { vehicles, loading: fleetLoading } = useFleet();
  const [rangeHours, setRangeHours] = useState(24 * 7);
  const [speedLimit, setSpeedLimit] = useState(DEFAULT_SPEED_LIMIT_KMH);

  const from = useMemo(() => new Date(Date.now() - rangeHours * 60 * 60 * 1000), [rangeHours]);
  const { historyByVehicle, loading: historyLoading } = useFleetPositionHistory(vehicles, from);

  const loading = fleetLoading || historyLoading;

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900">Conducción</h1>
      <p className="mb-6 text-sm text-slate-500">
        Puntaje de manejo de cada vehículo de tu flota — frenadas, aceleraciones y curvas bruscas, y excesos de
        velocidad, todo del 1 al 100%.
      </p>

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

      {loading && vehicles.length > 0 && <p className="text-sm text-slate-500">Calculando puntajes...</p>}

      {!loading && vehicles.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((v) => {
            const history = historyByVehicle[v.id] ?? [];
            const scores = computeCategoryScores(history, speedLimit);
            return <VehicleScoreCard key={v.id} vehicleName={v.name} plate={v.plate} scores={scores} />;
          })}
        </div>
      )}
    </div>
  );
}
