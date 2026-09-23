import { useEffect, useState } from "react";
import { DrivingScoreCard } from "../components/cockpit/DrivingScoreCard";
import { GForceGauge } from "../components/cockpit/GForceGauge";
import { MileageCard } from "../components/cockpit/MileageCard";
import { MiniMapCard } from "../components/cockpit/MiniMapCard";
import { SpeedGauge } from "../components/cockpit/SpeedGauge";
import { StatePills } from "../components/cockpit/StatePills";
import { StatusList } from "../components/cockpit/StatusList";
import { useFleet } from "../context/FleetContext";
import { useTodayTripStats } from "../hooks/useTodayTripStats";
import { classifyVehicleState } from "../lib/fleetStats";
import { AVL_ID } from "../lib/types";

export function CockpitPage() {
  const { vehicles, positions, loading } = useFleet();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && vehicles.length > 0) setSelectedId(vehicles[0]!.id);
  }, [selectedId, vehicles]);

  const vehicle = vehicles.find((v) => v.id === selectedId) ?? null;
  const position = vehicle ? (positions[vehicle.id] ?? null) : null;
  const { score, harshEvents, tripKm } = useTodayTripStats(vehicle?.id ?? null);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-500">Cargando...</div>;
  }

  if (!vehicle) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        No hay vehículos cargados todavía.
      </div>
    );
  }

  const state = classifyVehicleState(position ?? undefined);
  const totalKm = Math.round(Number(position?.ioData[AVL_ID.TOTAL_ODOMETER] ?? 0) / 100) / 10;

  return (
    <div className="h-full overflow-y-auto bg-violet-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        {vehicles.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  v.id === selectedId
                    ? "bg-violet-600 text-white"
                    : "bg-white text-slate-500 hover:bg-violet-100"
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        )}

        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-wide text-slate-900 sm:text-xl">
              {vehicle.name.toUpperCase()}
            </h1>
            {vehicle.plate && <p className="text-sm text-slate-400">{vehicle.plate}</p>}
          </div>
          <p className="shrink-0 text-sm text-slate-400">
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-3xl border border-violet-100 bg-white/60 p-4 shadow-sm shadow-violet-100 sm:p-6 lg:grid-cols-[260px_1fr_260px]">
          <div className="rounded-2xl bg-violet-50/60 p-3">
            <p className="mb-2 px-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Ubicación
            </p>
            <MiniMapCard position={position} />
          </div>

          <div className="flex items-center justify-center py-6">
            <SpeedGauge speed={position?.speed ?? 0} state={state} />
          </div>

          <div className="rounded-2xl bg-violet-50/60 p-4">
            <p className="mb-4 px-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Estado del vehículo
            </p>
            <StatusList position={position} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-12">
          <div className="col-span-1 flex items-center justify-center rounded-3xl border border-violet-100 bg-white p-4 shadow-sm shadow-violet-100 lg:col-span-2">
            <GForceGauge eventCount={harshEvents.length} />
          </div>
          <div className="col-span-1 lg:col-span-2">
            <MileageCard label="Total recorrido" km={totalKm} />
          </div>
          <div className="col-span-2 rounded-3xl border border-violet-100 bg-white p-4 shadow-sm shadow-violet-100 lg:col-span-4">
            <DrivingScoreCard score={score} events={harshEvents} />
          </div>
          <div className="col-span-1 lg:col-span-2">
            <MileageCard label="Recorrido hoy" km={tripKm} />
          </div>
          <div className="col-span-1 flex items-center justify-center rounded-3xl border border-violet-100 bg-white p-4 shadow-sm shadow-violet-100 lg:col-span-2">
            <StatePills current={state} />
          </div>
        </div>
      </div>
    </div>
  );
}
