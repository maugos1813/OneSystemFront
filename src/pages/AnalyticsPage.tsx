import { FleetMap } from "../components/analytics/FleetMap";
import { OdometerRanking } from "../components/analytics/OdometerRanking";
import { Panel } from "../components/analytics/Panel";
import { SpeedTrendChart } from "../components/analytics/SpeedTrendChart";
import { StatCard } from "../components/analytics/StatCard";
import { StateDonut } from "../components/analytics/StateDonut";
import { useFleet } from "../context/FleetContext";
import { useFleetSpeedTrend } from "../hooks/useFleetSpeedTrend";
import { useTodayEventCounts } from "../hooks/useTodayEventCounts";
import { computeFleetSummary, computeOdometerRanking, computeStateDistribution } from "../lib/fleetStats";

export function AnalyticsPage() {
  const { vehicles, devices, positions, loading } = useFleet();
  const { points: speedTrend } = useFleetSpeedTrend(vehicles);
  const { counts: todayEvents } = useTodayEventCounts(vehicles);

  const summary = computeFleetSummary(vehicles, devices, positions);
  const stateDistribution = computeStateDistribution(vehicles, positions);
  const odometerRanking = computeOdometerRanking(vehicles, positions);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-500">Cargando...</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-8">
      <h1 className="text-xl font-semibold text-slate-900">Analíticas de flota</h1>
      <p className="mb-6 text-sm text-slate-500">Resumen general de tus vehículos, hoy.</p>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Vehículos" value={String(summary.total)} />
        <StatCard label="En línea" value={String(summary.online)} variant="mint" />
        <StatCard label="En movimiento" value={String(summary.moving)} variant="violet" />
        <StatCard label="Vel. promedio" value={String(summary.avgSpeedMoving)} suffix="km/h" />
        <StatCard label="Encendidos hoy" value={String(todayEvents.ignitionChanges)} />
        <StatCard label="Movimientos hoy" value={String(todayEvents.movementChanges)} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Velocidad promedio de la flota (hoy)" className="lg:col-span-2">
          <SpeedTrendChart points={speedTrend} />
        </Panel>
        <Panel title="Estado actual">
          <StateDonut entries={stateDistribution} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Mapa de flota" className="lg:col-span-2">
          <FleetMap vehicles={vehicles} positions={positions} />
        </Panel>
        <Panel title="Ranking por km recorridos">
          <OdometerRanking entries={odometerRanking} />
        </Panel>
      </div>
    </div>
  );
}
