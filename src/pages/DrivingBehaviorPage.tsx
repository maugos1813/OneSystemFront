import { useEffect, useMemo, useState } from "react";
import { AreaFilterPills } from "../components/AreaFilterPills";
import { Panel } from "../components/analytics/Panel";
import { FleetScoreTable, type FleetRow } from "../components/driving/FleetScoreTable";
import { IncidentList } from "../components/driving/IncidentList";
import { ScoreRing } from "../components/driving/ScoreRing";
import { useFleet } from "../context/FleetContext";
import { getDrivingStyle, getVehicleIncidents } from "../lib/api";
import { INCIDENT_LABELS, type Incident, type IncidentType } from "../lib/drivingBehavior";
import type { DrivingStyleResponse, VehicleDrivingStyle } from "../lib/types";

const RANGES: Array<{ label: string; days: number }> = [
  { label: "24h", days: 1 },
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
];

const CATEGORY_ORDER: IncidentType[] = ["harshBraking", "harshAcceleration", "harshCornering", "speeding"];

const DEFAULT_SPEED_LIMIT_KMH = 120;
const SPEED_LIMIT_DEBOUNCE_MS = 500;

type Selection = "overall" | IncidentType;

const QUALITY_NOTES: Partial<Record<VehicleDrivingStyle["quality"], string>> = {
  no_data: "Este vehículo no tiene posiciones en el periodo elegido.",
  insufficient_data: "Recorrió menos de 20 km en el periodo: no hay datos suficientes para puntuar su manejo.",
  speeding_only:
    "Este dispositivo reporta con poca frecuencia, así que no se pueden detectar frenadas, aceleraciones ni curvas bruscas. Solo se puntúa la velocidad.",
};

function scoreFor(vehicle: VehicleDrivingStyle, selection: Selection): number | null {
  return vehicle.scores ? vehicle.scores[selection === "overall" ? "overall" : selection] : null;
}

function totalIncidents(vehicle: VehicleDrivingStyle): number {
  const { harshBraking, harshAcceleration, harshCornering, speeding } = vehicle.incidents;
  return (harshBraking ?? 0) + (harshAcceleration ?? 0) + (harshCornering ?? 0) + speeding;
}

export function DrivingBehaviorPage() {
  const { filteredVehicles: vehicles, loading: fleetLoading } = useFleet();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState(7);
  const [speedLimitInput, setSpeedLimitInput] = useState(DEFAULT_SPEED_LIMIT_KMH);
  const [speedLimit, setSpeedLimit] = useState(DEFAULT_SPEED_LIMIT_KMH);
  const [selection, setSelection] = useState<Selection>("overall");
  const [activeIncidentIndex, setActiveIncidentIndex] = useState<number | null>(null);

  const [style, setStyle] = useState<DrivingStyleResponse | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Typing a limit shouldn't fire a calculation per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSpeedLimit(speedLimitInput), SPEED_LIMIT_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [speedLimitInput]);

  useEffect(() => {
    if (vehicles.length === 0) return;
    if (!selectedVehicleId || !vehicles.some((v) => v.id === selectedVehicleId)) {
      setSelectedVehicleId(vehicles[0]!.id);
    }
  }, [selectedVehicleId, vehicles]);

  useEffect(() => {
    setSelection("overall");
    setActiveIncidentIndex(null);
  }, [selectedVehicleId, rangeDays]);

  useEffect(() => {
    setActiveIncidentIndex(null);
  }, [selection, speedLimit]);

  useEffect(() => {
    let cancelled = false;
    setStyle(null);
    setError(null);
    getDrivingStyle({ days: rangeDays, speedLimit })
      .then((result) => {
        if (!cancelled) setStyle(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo calcular el estilo de conducción");
      });
    return () => {
      cancelled = true;
    };
  }, [rangeDays, speedLimit]);

  useEffect(() => {
    if (!selectedVehicleId) return;
    let cancelled = false;
    setIncidents([]);
    getVehicleIncidents(selectedVehicleId, { days: rangeDays, speedLimit })
      .then((result) => {
        if (!cancelled) setIncidents(result.incidents);
      })
      .catch(() => {
        if (!cancelled) setIncidents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedVehicleId, rangeDays, speedLimit]);

  const visibleIds = useMemo(() => new Set(vehicles.map((v) => v.id)), [vehicles]);
  const visibleStyles = useMemo(() => (style?.vehicles ?? []).filter((v) => visibleIds.has(v.vehicleId)), [style, visibleIds]);
  const current = visibleStyles.find((v) => v.vehicleId === selectedVehicleId) ?? null;

  const visibleIncidents = useMemo(
    () => (selection === "overall" ? incidents : incidents.filter((i) => i.type === selection)),
    [incidents, selection],
  );

  const fleetRows = useMemo<FleetRow[]>(
    () =>
      visibleStyles.map((v) => ({
        vehicleId: v.vehicleId,
        name: v.name,
        plate: v.plate,
        score: scoreFor(v, selection),
        events: v.scores ? (selection === "overall" ? totalIncidents(v) : v.incidents[selection]) : null,
        distanceKm: v.distanceKm,
        trips: v.trips,
        durationMs: v.drivingHours * 3_600_000,
      })),
    [visibleStyles, selection],
  );

  const loading = fleetLoading || (!style && !error);
  const categoryLabel = selection === "overall" ? "General" : INCIDENT_LABELS[selection];
  const qualityNote = current ? QUALITY_NOTES[current.quality] : undefined;
  const pointsPerIncident = style?.rules.pointsPerIncidentPer100Km ?? 5;

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0e1a]">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Conducción</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Puntaje de manejo por vehículo, calculado por cada 100 km recorridos: cada incidente por 100 km resta{" "}
        {pointsPerIncident} puntos. Hacé click en cualquier puntaje para ver cuándo y dónde pasó cada incidente, y comparar
        toda la flota en esa métrica.
      </p>

      <div className="mb-4">
        <AreaFilterPills />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {vehicles.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedVehicleId(v.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              v.id === selectedVehicleId
                ? "brand-button"
                : "bg-white text-slate-500 hover:bg-violet-50 dark:bg-[#111729] dark:text-slate-400 dark:hover:bg-white/10"
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
            onClick={() => setRangeDays(r.days)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              r.days === rangeDays
                ? "bg-slate-900 text-white dark:bg-blue-600"
                : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-[#111729] dark:text-slate-400 dark:hover:bg-white/10"
            }`}
          >
            {r.label}
          </button>
        ))}

        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />

        <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          Límite de velocidad
          <input
            type="number"
            min={10}
            max={300}
            value={speedLimitInput}
            onChange={(e) => setSpeedLimitInput(Math.min(300, Math.max(10, Number(e.target.value) || DEFAULT_SPEED_LIMIT_KMH)))}
            className="field-input w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          km/h
        </label>
      </div>

      {!fleetLoading && vehicles.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no hay vehículos cargados.</p>
      )}

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {current && loading && <p className="text-sm text-slate-500 dark:text-slate-400">Calculando puntajes...</p>}

      {current && !loading && (
        <>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            {current.distanceKm} km · {current.drivingHours} h en movimiento · {current.trips}{" "}
            {current.trips === 1 ? "viaje" : "viajes"}
          </p>

          {qualityNote && (
            <p className="mb-4 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              {qualityNote}
            </p>
          )}

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            <ScoreRing
              label="General"
              score={current.scores?.overall ?? null}
              count={current.scores ? totalIncidents(current) : null}
              countLabel="incidentes en total"
              active={selection === "overall"}
              onClick={() => setSelection("overall")}
            />
            {CATEGORY_ORDER.map((key) => (
              <ScoreRing
                key={key}
                label={INCIDENT_LABELS[key]}
                score={current.scores ? current.scores[key] : null}
                count={current.scores ? current.incidents[key] : null}
                countLabel="eventos"
                active={selection === key}
                onClick={() => setSelection(key)}
              />
            ))}
          </div>

          <Panel title={selection === "overall" ? "Todos los incidentes" : INCIDENT_LABELS[selection]} className="mb-6">
            <IncidentList
              incidents={visibleIncidents}
              activeIndex={activeIncidentIndex}
              onSelect={setActiveIncidentIndex}
            />
          </Panel>
        </>
      )}

      {style && (
        <Panel title={`Flota — ${categoryLabel}`}>
          <FleetScoreTable
            rows={fleetRows}
            categoryLabel={categoryLabel}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={setSelectedVehicleId}
          />
        </Panel>
      )}
    </div>
  );
}
