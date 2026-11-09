import { AreaFilterPills } from "../components/AreaFilterPills";
import { DeviceSourceBadge } from "../components/DeviceSourceBadge";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { useT, type Translate } from "../i18n";
import { isLowVoltage, isOffline } from "../lib/alerts";
import { trackGlow } from "../lib/glow";
import { AVL_ID } from "../lib/types";

function relativeTime(iso: string | null, t: Translate): string {
  if (!iso) return t("health.never");
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return t("time.justNow");
  if (seconds < 3600) return t("time.minutesAgo", { count: Math.round(seconds / 60) });
  if (seconds < 86400) return t("time.hoursAgo", { count: Math.round(seconds / 3600) });
  return t("time.daysAgo", { count: Math.round(seconds / 86400) });
}

type Severity = "ok" | "warning" | "critical";

const SEVERITY_COLOR: Record<Severity, string> = {
  ok: "#16a34a",
  warning: "#f59e0b",
  critical: "#dc2626",
};

export function DeviceHealthPage() {
  const t = useT();
  const isPlatform = useAuth().currentUser?.isPlatform === true;
  const { devices: allDevices, vehicles, positions, loading, settings, selectedArea } = useFleet();
  const deviceOfflineMs = (settings?.alerts.deviceOfflineHours ?? 2) * 3_600_000;
  const lowBatteryMv = (settings?.alerts.lowBatteryVoltage ?? 11.5) * 1000;

  const vehicleByDeviceId = new Map(vehicles.filter((v) => v.deviceId).map((v) => [v.deviceId, v]));
  const devices = selectedArea
    ? allDevices.filter((d) => vehicleByDeviceId.get(d.id)?.fleetGroup === selectedArea)
    : allDevices;

  const rows = devices.map((device) => {
    const vehicle = vehicleByDeviceId.get(device.id);
    const position = vehicle ? positions[vehicle.id] : undefined;
    const offline = isOffline(device.lastSeenAt, deviceOfflineMs);
    const lowBattery = isLowVoltage(position, lowBatteryMv);
    const satellites = position?.satellites ?? null;
    const gsmSignal = position && position.ioData["21"] !== undefined ? Number(position.ioData["21"]) : null;
    const batteryVoltage =
      position && position.ioData[AVL_ID.BATTERY_VOLTAGE] !== undefined
        ? Number(position.ioData[AVL_ID.BATTERY_VOLTAGE]) / 1000
        : null;
    const externalVoltage =
      position && position.ioData[AVL_ID.EXTERNAL_VOLTAGE] !== undefined
        ? Number(position.ioData[AVL_ID.EXTERNAL_VOLTAGE]) / 1000
        : null;
    const weakSignal = gsmSignal !== null && gsmSignal <= 1;

    let severity: Severity = "ok";
    if (offline || lowBattery) severity = "critical";
    else if (weakSignal || (satellites !== null && satellites < 4)) severity = "warning";

    return {
      device,
      vehicleName: vehicle?.name ?? t("health.unassigned"),
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
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0e1a]">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("health.title")}</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        {t("health.intro")}
      </p>

      <div className="mb-6">
        <AreaFilterPills />
      </div>

      {!loading && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 dark:bg-red-500/15 dark:text-red-400">
            {t("health.critical", { count: criticalCount })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            {t("health.review", { count: warningCount })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            {t("health.healthy", { count: rows.length - criticalCount - warningCount })}
          </span>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</p>}

      {!loading && rows.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("health.none")}</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="float-card overflow-x-auto rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-violet-100 bg-violet-50/60 text-xs text-slate-500 uppercase dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">{t("health.colStatus")}</th>
                <th className="px-4 py-2 font-medium">{t("health.colVehicle")}</th>
                {isPlatform && <th className="px-4 py-2 font-medium">IMEI</th>}
                <th className="px-4 py-2 font-medium">{t("health.colSource")}</th>
                <th className="px-4 py-2 font-medium">{t("health.colLastSeen")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("health.colBattery")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("health.colExternal")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("health.colSatellites")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("health.colGsm")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
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
                      {row.offline ? t("health.disconnected") : row.severity === "ok" ? t("health.statusHealthy") : t("health.statusReview")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.vehicleName}</td>
                  {isPlatform && <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.device.imei}</td>}
                  <td className="px-4 py-3">
                    <DeviceSourceBadge source={row.device.source} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {relativeTime(row.device.lastSeenAt, t)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {row.batteryVoltage !== null ? `${row.batteryVoltage.toFixed(1)} V` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {row.externalVoltage !== null ? `${row.externalVoltage.toFixed(1)} V` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {row.satellites ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
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
