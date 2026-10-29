import { useEffect, useState } from "react";
import { AreaFilterPills } from "../components/AreaFilterPills";
import { VehiclePicker } from "../components/VehiclePicker";
import { DrivingScoreCard } from "../components/cockpit/DrivingScoreCard";
import { GForceGauge } from "../components/cockpit/GForceGauge";
import { MileageCard } from "../components/cockpit/MileageCard";
import { DriveMap } from "../components/cockpit/DriveMap";
import { SpeedGauge } from "../components/cockpit/SpeedGauge";
import { StatePills } from "../components/cockpit/StatePills";
import { StatusList } from "../components/cockpit/StatusList";
import { useFleet } from "../context/FleetContext";
import { useSmoothedPosition } from "../hooks/useSmoothedPosition";
import { useTodayDrivingStyle } from "../hooks/useTodayDrivingStyle";
import { classifyVehicleState } from "../lib/fleetStats";
import { trackGlow } from "../lib/glow";
import { AVL_ID } from "../lib/types";

export function CockpitPage() {
  const { filteredVehicles: vehicles, positions, loading } = useFleet();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (vehicles.length === 0) return;
    if (!selectedId || !vehicles.some((v) => v.id === selectedId)) setSelectedId(vehicles[0]!.id);
  }, [selectedId, vehicles]);

  const vehicle = vehicles.find((v) => v.id === selectedId) ?? null;
  const position = vehicle ? (positions[vehicle.id] ?? null) : null;
  const smoothed = useSmoothedPosition(position);
  const { style: todayStyle, loading: styleLoading } = useTodayDrivingStyle(vehicle?.id ?? null);
  const { harshBraking, harshAcceleration, harshCornering } = todayStyle?.incidents ?? {};
  const harshEventCount = (harshBraking ?? 0) + (harshAcceleration ?? 0) + (harshCornering ?? 0);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">Cargando...</div>
    );
  }

  const state = classifyVehicleState(position ?? undefined);
  const totalKm =
    position?.ioData[AVL_ID.TOTAL_ODOMETER] !== undefined
      ? Math.round(Number(position.ioData[AVL_ID.TOTAL_ODOMETER]) / 100) / 10
      : null;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto bg-violet-50 p-3 sm:p-4 lg:overflow-hidden dark:bg-[#0a0e1a]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <AreaFilterPills />
        {vehicle && vehicles.length > 1 && (
          <VehiclePicker vehicles={vehicles} selectedId={selectedId} onSelect={setSelectedId} />
        )}
        {vehicle && (
          <div className="ml-auto flex items-baseline gap-3">
            <h1 className="text-lg font-bold tracking-wide text-slate-900 sm:text-xl dark:text-white">
              {vehicle.name.toUpperCase()}
            </h1>
            {vehicle.plate && vehicle.plate !== vehicle.name && (
              <span className="text-sm text-slate-400 dark:text-slate-500">{vehicle.plate}</span>
            )}
            <span className="text-sm text-slate-400 dark:text-slate-500">
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
      </div>

      {!vehicle && (
        <p className="flex h-40 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          Ningún vehículo en esta área.
        </p>
      )}

      {vehicle && (
        <>
          <div className="relative min-h-[60vh] flex-1 overflow-hidden rounded-3xl border border-white bg-white shadow-lg shadow-blue-100/40 lg:min-h-[320px] dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
            <DriveMap vehicleId={vehicle.id} position={position} smoothed={smoothed} />

            {/* The instruments sit over the map, like a dashboard: forced dark so they read on any map. */}
            <div className="dark pointer-events-none absolute bottom-3 left-3 w-32 sm:w-52 lg:w-60">
              <div className="rounded-full bg-slate-950/85 p-2 backdrop-blur-md">
                <SpeedGauge speed={smoothed?.speed ?? 0} state={state} />
              </div>
            </div>
            <div className="dark absolute top-3 right-3 hidden w-72 rounded-2xl bg-slate-950/85 p-4 backdrop-blur-md lg:block">
              <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">Estado del vehículo</p>
              <StatusList position={position} />
            </div>
          </div>

          <div onMouseMove={trackGlow} className="glow float-card rounded-2xl bg-white p-4 lg:hidden dark:bg-[#111729]">
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">
              Estado del vehículo
            </p>
            <StatusList position={position} />
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-12">
            <div
              onMouseMove={trackGlow}
              className="glow float-card col-span-1 flex items-center justify-center rounded-3xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 lg:col-span-2 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
            >
              <GForceGauge eventCount={harshEventCount} />
            </div>
            <div className="col-span-1 lg:col-span-2">
              <MileageCard label="Total recorrido" km={totalKm} />
            </div>
            <div
              onMouseMove={trackGlow}
              className="glow float-card col-span-2 rounded-3xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 lg:col-span-4 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
            >
              <DrivingScoreCard style={todayStyle} loading={styleLoading} />
            </div>
            <div className="col-span-1 lg:col-span-2">
              <MileageCard label="Recorrido hoy" km={todayStyle?.distanceKm ?? null} />
            </div>
            <div
              onMouseMove={trackGlow}
              className="glow float-card col-span-1 flex items-center justify-center rounded-3xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 lg:col-span-2 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
            >
              <StatePills current={state} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
