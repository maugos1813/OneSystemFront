import { useFleet } from "../context/FleetContext";
import { isLowVoltage, isOffline } from "../lib/alerts";
import { trackGlow } from "../lib/glow";
import { AVL_ID } from "../lib/types";

function relativeTime(iso: string | null): string {
  if (!iso) return "Nunca";
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "recién";
  if (seconds < 3600) return `hace ${Math.round(seconds / 60)}min`;
  if (seconds < 86400) return `hace ${Math.round(seconds / 3600)}h`;
  return `hace ${Math.round(seconds / 86400)}d`;
}

type Severity = "ok" | "warning" | "critical";

const SEVERITY_COLOR: Record<Severity, string> = {
  ok: "#16a34a",
  warning: "#f59e0b",
  critical: "#dc2626",
};

export function DeviceHealthPage() {
  const { devices, vehicles, positions, loading, settings } = useFleet();
  const deviceOfflineMs = (settings?.alerts.deviceOfflineHours ?? 2) * 3_600_000;
  const lowBatteryMv = (settings?.alerts.lowBatteryVoltage ?? 11.5) * 1000;

  const vehicleByDeviceId = new Map(vehicles.filter((v) => v.deviceId).map((v) => [v.deviceId, v]));

  const rows = devices.map((device) => {
    const vehicle = vehicleByDeviceId.get(device.id);
    const position = vehicle ? positions[vehicle.id] : undefined;
    const offline = isOffline(device.lastSeenAt, deviceOfflineMs);
    const lowBattery = isLowVoltage(position, lowBatteryMv);
    const satellites = position?.satellites ?? null;
    const gsmSignal = position ? Number(position.ioData["21"] ?? 0) : null;
    const batteryVoltage = position ? Number(position.ioData[AVL_ID.BATTERY_VOLTAGE] ?? 0) / 1000 : null;
    const externalVoltage = position ? Number(position.ioData[AVL_ID.EXTERNAL_VOLTAGE] ?? 0) / 1000 : null;
    const weakSignal = gsmSignal !== null && gsmSignal <= 1;

    let severity: Severity = "ok";
    if (offline || lowBattery) severity = "critical";
    else if (weakSignal || (satellites !== null && satellites < 4)) severity = "warning";

    return {
      device,
      vehicleName: vehicle?.name ?? "Sin asignar",
      offline,
      severity,
      batteryVoltage,
      externalVoltage,
      satellites,
      gsmSignal,
    };
  });

  const criticalCount = rows.filter((r) => r.severity === "critical").length;
  const warningCount = rows.filter((r) => r.severity === "warning").length;

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900">Salud del dispositivo</h1>
      <p className="mb-6 text-sm text-slate-500">
        Estado de conectividad y hardware de todos los dispositivos de tu flota.
      </p>

      {!loading && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
            {criticalCount} con problema crítico
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600">
            {warningCount} para revisar
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
            {rows.length - criticalCount - warningCount} saludables
          </span>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Cargando...</p>}

      {!loading && rows.length === 0 && <p className="text-sm text-slate-500">Todavía no hay dispositivos.</p>}

      {!loading && rows.length > 0 && (
        <div className="float-card overflow-x-auto rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-violet-100 bg-violet-50/60 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Vehículo</th>
                <th className="px-4 py-2 font-medium">IMEI</th>
                <th className="px-4 py-2 font-medium">Última conexión</th>
                <th className="px-4 py-2 text-right font-medium">Batería</th>
                <th className="px-4 py-2 text-right font-medium">Voltaje externo</th>
                <th className="px-4 py-2 text-right font-medium">Satélites</th>
                <th className="px-4 py-2 text-right font-medium">Señal GSM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr
                  key={row.device.id}
                  onMouseMove={trackGlow}
                  className="glow"
                  style={{ boxShadow: `inset 4px 0 0 0 ${SEVERITY_COLOR[row.severity]}` }}
                >
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${SEVERITY_COLOR[row.severity]}1a`, color: SEVERITY_COLOR[row.severity] }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEVERITY_COLOR[row.severity] }} />
                      {row.offline ? "Desconectado" : row.severity === "ok" ? "Saludable" : "Revisar"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.vehicleName}</td>
                  <td className="px-4 py-3 text-slate-600">{row.device.imei}</td>
                  <td className="px-4 py-3 text-slate-500">{relativeTime(row.device.lastSeenAt)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {row.batteryVoltage !== null ? `${row.batteryVoltage.toFixed(1)} V` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {row.externalVoltage !== null ? `${row.externalVoltage.toFixed(1)} V` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.satellites ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {row.gsmSignal !== null ? `${row.gsmSignal}/5` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
