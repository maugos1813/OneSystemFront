import { Plus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AreaFilterPills } from "../components/AreaFilterPills";
import { DeviceSourceBadge } from "../components/DeviceSourceBadge";
import { StatusBadge, VehicleStatusBadge } from "../components/StatusBadge";
import { isIdling, thresholdsFromSettings, vehicleStatus } from "../lib/vehicleStatus";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { useLanguage, type MessageKey, type Translate } from "../i18n";
import { isLowVoltage, isOffline } from "../lib/alerts";
import { ApiError, claimDevice } from "../lib/api";
import { DEVICE_MODELS, hasProfile, modelProfile } from "../lib/deviceModels";
import { trackGlow } from "../lib/glow";
import { AVL_ID, type Device, type DeviceSource } from "../lib/types";
import { isReadOnlyView } from "../lib/viewMode";

function formatDate(iso: string | null, locale: string, never: string): string {
  if (!iso) return never;
  return new Date(iso).toLocaleString(locale);
}

/** "2 min ago", "3 h ago"; the exact moment is in the tooltip. */
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

/** What the tracker last reported about itself, and the verdict drawn from it. */
interface Health {
  severity: Severity;
  offline: boolean;
  batteryVoltage: number | null;
  externalVoltage: number | null;
  satellites: number | null;
  gsmSignal: number | null;
}

type SourceFilter = "all" | DeviceSource;

const SOURCE_FILTERS: Array<{ key: SourceFilter; label: string | MessageKey }> = [
  { key: "all", label: "devices.all" },
  { key: "teltonika", label: "Teltonika" },
  { key: "radius_velocity", label: "Velocity" },
];

function ModelTags({ model }: { model: string }) {
  const { t } = useLanguage();
  if (!hasProfile(model)) return null;
  const profile = modelProfile(model);
  const tags = [profile.obd ? "OBD" : null, profile.output ? t("devices.tagOutput") : null].filter(Boolean);
  if (tags.length === 0) return null;
  return (
    <span className="ml-2 inline-flex gap-1 align-middle">
      {tags.map((tag) => (
        <span key={tag} className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-white/10 dark:text-violet-300">
          {tag}
        </span>
      ))}
    </span>
  );
}

export function DevicesPage() {
  const { t, locale } = useLanguage();
  const { currentUser } = useAuth();
  const { devices: allDevices, vehicles, positions, settings, loading, refetch, selectedArea } = useFleet();
  const vehicleByDeviceId = new Map(vehicles.filter((v) => v.deviceId).map((v) => [v.deviceId, v]));
  // The flota picked in the pills (all of them when none).
  const devices = selectedArea ? allDevices.filter((d) => vehicleByDeviceId.get(d.id)?.fleetGroup === selectedArea) : allDevices;
  const deviceOfflineMs = (settings?.alerts.deviceOfflineHours ?? 2) * 3_600_000;
  const lowBatteryMv = (settings?.alerts.lowBatteryVoltage ?? 11.5) * 1000;
  /** The health values come from the device's last position, so they are as fresh as its last report (a Velocity device reports none). */
  const healthOf = (device: Device): Health => {
    const position = positions[vehicleByDeviceId.get(device.id)?.id ?? ""];
    const offline = isOffline(device.lastSeenAt, deviceOfflineMs);
    const satellites = position?.satellites ?? null;
    const gsmSignal = position && position.ioData["21"] !== undefined ? Number(position.ioData["21"]) : null;
    const volts = (id: string) => (position && position.ioData[id] !== undefined ? Number(position.ioData[id]) / 1000 : null);
    let severity: Severity = "ok";
    if (offline || isLowVoltage(position, lowBatteryMv)) severity = "critical";
    else if ((gsmSignal !== null && gsmSignal <= 1) || (satellites !== null && satellites < 4)) severity = "warning";
    return { severity, offline, batteryVoltage: volts(AVL_ID.BATTERY_VOLTAGE), externalVoltage: volts(AVL_ID.EXTERNAL_VOLTAGE), satellites, gsmSignal };
  };
  // The IMEI is OneSystec's: it adds hardware by IMEI and sees it. A client knows each device by its vehicle.
  // OneSystec's own view only: looking at a client's account (read-only) it sees what the client sees, with no IMEIs, makes or claim form.
  const isPlatform = currentUser?.isPlatform === true && !isReadOnlyView(currentUser);
  const navigate = useNavigate();
  const [imei, setImei] = useState("");
  const [model, setModel] = useState<string>(DEVICE_MODELS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const byKey: Record<SourceFilter, number> = { all: devices.length, teltonika: 0, radius_velocity: 0 };
    for (const d of devices) byKey[d.source] += 1;
    return byKey;
  }, [devices]);

  const summary = useMemo(() => {
    const total = { ok: 0, warning: 0, critical: 0 };
    for (const d of devices) total[healthOf(d).severity] += 1;
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, vehicles, positions, settings]);

  // Teltonika first, then each group by vehicle, so the same kind of device sits together.
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices
      .filter((d) => sourceFilter === "all" || d.source === sourceFilter)
      .filter((d) => {
        if (!q) return true;
        const v = vehicleByDeviceId.get(d.id);
        return [d.imei, d.model, v?.name, v?.plate].some((field) => field?.toLowerCase().includes(q));
      })
      .sort(
        (a, b) =>
          Number(b.source === "teltonika") - Number(a.source === "teltonika") ||
          (vehicleByDeviceId.get(a.id)?.name ?? "\uffff").localeCompare(vehicleByDeviceId.get(b.id)?.name ?? "\uffff"),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, vehicles, sourceFilter, search]);

  async function handleClaim(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await claimDevice(imei.trim(), model);
      setImei("");
      refetch();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? err.message
          : err instanceof ApiError && err.status === 404
            ? t("devices.claimBadImei")
            : t("devices.addFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  /** The same word as on the map: a parked vehicle is "parado"; "sin señal" is the one that raises alerts. */
  const statusOf = (device: (typeof devices)[number]) => {
    const position = positions[vehicleByDeviceId.get(device.id)?.id ?? device.id];
    return position ? (
      <VehicleStatusBadge status={vehicleStatus(position, device.lastSeenAt, thresholdsFromSettings(settings))} idling={isIdling(position)} />
    ) : (
      <StatusBadge lastSeenAt={device.lastSeenAt} />
    );
  };
  const titleOf = (device: (typeof devices)[number]) =>
    isPlatform ? device.imei : (vehicleByDeviceId.get(device.id)?.name ?? t("devices.unassigned"));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("devices.title")}</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        {t("devices.intro")}
        {isPlatform && t("devices.introPlatform")}
      </p>

      {isPlatform && (
        <>
          <form
            onSubmit={handleClaim}
            onMouseMove={trackGlow}
            className="glow float-card mb-6 flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 sm:flex-row sm:items-end dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
          >
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="imei">
                {t("devices.imei")}
              </label>
              <input
                id="imei"
                type="text"
                required
                minLength={10}
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                placeholder="356307042441013"
                className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="claim-model">
                {t("devices.model")}
              </label>
              <select
                id="claim-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-36 dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                {DEVICE_MODELS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="brand-button flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t("devices.add")}
            </button>
          </form>
          <p className="mb-6 -mt-4 text-xs text-slate-500 dark:text-slate-400">{modelProfile(model).summary}</p>
          {error && <p className="mb-6 -mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </>
      )}

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</p>}

      {!loading && devices.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("devices.none")}</p>
      )}

      <div className="mb-4 empty:hidden">
        <AreaFilterPills />
      </div>

      {!loading && devices.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 dark:bg-red-500/15 dark:text-red-400">
            {t("health.critical", { count: summary.critical })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            {t("health.review", { count: summary.warning })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            {t("health.healthy", { count: summary.ok })}
          </span>
        </div>
      )}

      {!loading && devices.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* The make of a tracker (Teltonika, Velocity…) is for OneSystec only; a client sees one list of devices. */}
          {isPlatform && SOURCE_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSourceFilter(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                sourceFilter === key
                  ? "brand-button"
                  : "bg-white text-slate-500 hover:bg-violet-100 dark:bg-[#111729] dark:text-slate-400 dark:hover:bg-white/10"
              }`}
            >
              {label === "devices.all" ? t("devices.all") : label} <span className="opacity-70">{counts[key]}</span>
            </button>
          ))}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isPlatform ? t("devices.searchPlatform") : t("devices.search")}
            className="field-input ml-auto w-full rounded-xl border border-slate-300 px-3 py-1.5 text-sm sm:w-64 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
      )}

      {!loading && devices.length > 0 && shown.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("devices.noMatch")}</p>
      )}

      {/* On a big screen a table; on a laptop in a narrow window, a tablet or a phone each device is a card, so nothing needs dragging sideways. */}
      {!loading && shown.length > 0 && (
        <div className="float-card hidden overflow-x-auto rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50 xl:block dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-violet-100 bg-violet-50/60 text-xs text-slate-500 uppercase dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">{isPlatform ? "IMEI" : t("devices.colVehicle")}</th>
                <th className="px-4 py-2 font-medium">{t("devices.model")}</th>
                <th className="px-4 py-2 font-medium">{t("devices.colStatus")}</th>
                <th className="px-4 py-2 font-medium">{t("devices.colLastSeen")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("health.colBattery")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("health.colExternal")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("health.colSatellites")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("health.colGsm")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {shown.map((device) => {
                const health = healthOf(device);
                const metrics = healthMetrics(health, t);
                return (
                  <tr
                    key={device.id}
                    onClick={() => navigate(`/dispositivos/${device.id}`)}
                    className="cursor-pointer hover:bg-violet-50/40 dark:hover:bg-white/5"
                    style={{ boxShadow: `inset 4px 0 0 0 ${SEVERITY_COLOR[health.severity]}` }}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      <Link to={`/dispositivos/${device.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                        {titleOf(device)}
                      </Link>
                      {isPlatform && (
                        <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                          {vehicleByDeviceId.get(device.id)?.name ?? t("devices.unassigned")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <span className="whitespace-nowrap">
                        {device.model}
                        <ModelTags model={device.model} />
                      </span>
                      {isPlatform && (
                        <div className="mt-1">
                          <DeviceSourceBadge source={device.source} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        {statusOf(device)}
                        <HealthChip health={health} t={t} />
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400" title={formatDate(device.lastSeenAt, locale, t("devices.never"))}>
                      {relativeTime(device.lastSeenAt, t)}
                    </td>
                    {metrics.map(([label, value]) => (
                      <td key={label} className="px-4 py-3 text-right tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {value}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && shown.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
          {shown.map((device) => {
            const health = healthOf(device);
            return (
              <li
                key={device.id}
                onClick={() => navigate(`/dispositivos/${device.id}`)}
                className="float-card cursor-pointer rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 active:bg-violet-50/40 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
                style={{ boxShadow: `inset 4px 0 0 0 ${SEVERITY_COLOR[health.severity]}` }}
              >
                {/* Who: the vehicle (or the IMEI for OneSystec) and how it is doing right now. */}
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/dispositivos/${device.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="min-w-0 truncate text-base font-semibold text-slate-900 hover:underline dark:text-white"
                  >
                    {titleOf(device)}
                  </Link>
                  <span className="shrink-0">{statusOf(device)}</span>
                </div>
                {isPlatform && (
                  <p className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-300">
                    {vehicleByDeviceId.get(device.id)?.name ?? <span className="text-slate-400">{t("devices.unassigned")}</span>}
                  </p>
                )}

                {/* What: the hardware and its health verdict. */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                  <span>
                    {device.model}
                    <ModelTags model={device.model} />
                  </span>
                  {isPlatform && <DeviceSourceBadge source={device.source} />}
                  <HealthChip health={health} t={t} />
                </div>

                {/* The tracker's own readings, from its last report. */}
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3 sm:grid-cols-4 dark:border-white/10">
                  {healthMetrics(health, t).map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-[10px] font-medium text-slate-400 uppercase dark:text-slate-500">{label}</dt>
                      <dd className="text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400" title={formatDate(device.lastSeenAt, locale, t("devices.never"))}>
                  {t("devices.colLastSeen")}: {relativeTime(device.lastSeenAt, t)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** The four readings of a tracker, labelled; "—" where the device (or its source) does not report it. */
function healthMetrics(health: Health, t: Translate): Array<[string, string]> {
  return [
    [t("health.colBattery"), health.batteryVoltage !== null ? `${health.batteryVoltage.toFixed(1)} V` : "—"],
    [t("health.colExternal"), health.externalVoltage !== null ? `${health.externalVoltage.toFixed(1)} V` : "—"],
    [t("health.colSatellites"), health.satellites !== null ? String(health.satellites) : "—"],
    [t("health.colGsm"), health.gsmSignal !== null ? `${health.gsmSignal}/5` : "—"],
  ];
}

/** The health verdict (good / to check / disconnected), in its colour. */
function HealthChip({ health, t }: { health: Health; t: Translate }) {
  const color = SEVERITY_COLOR[health.severity];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${color}1a`, color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {health.offline ? t("health.disconnected") : health.severity === "ok" ? t("health.statusHealthy") : t("health.statusReview")}
    </span>
  );
}
