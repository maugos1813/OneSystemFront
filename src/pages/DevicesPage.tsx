import { Plus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DeviceSourceBadge } from "../components/DeviceSourceBadge";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { ApiError, claimDevice } from "../lib/api";
import { DEVICE_MODELS, hasProfile, modelProfile } from "../lib/deviceModels";
import { trackGlow } from "../lib/glow";
import type { DeviceSource } from "../lib/types";

function formatDate(iso: string | null): string {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString();
}

type SourceFilter = "all" | DeviceSource;

const SOURCE_FILTERS: Array<{ key: SourceFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "teltonika", label: "Teltonika" },
  { key: "radius_velocity", label: "Velocity" },
];

function ModelTags({ model }: { model: string }) {
  if (!hasProfile(model)) return null;
  const profile = modelProfile(model);
  const tags = [profile.obd ? "OBD" : null, profile.output ? "Salida" : null].filter(Boolean);
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
  const { currentUser } = useAuth();
  const { devices, vehicles, loading, refetch } = useFleet();
  const vehicleByDeviceId = new Map(vehicles.filter((v) => v.deviceId).map((v) => [v.deviceId, v]));
  const canManage = currentUser?.role === "owner" || currentUser?.role === "admin";
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
            ? "Ese IMEI ya está vinculado a otra empresa."
            : "No se pudo agregar el dispositivo",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Dispositivos</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Los trackers GPS vinculados a tu empresa.
        {canManage && " Para agregar uno nuevo escribe su IMEI: puedes hacerlo antes de que se conecte, no necesita SIM todavía."}
      </p>

      {canManage && (
        <>
          <form
            onSubmit={handleClaim}
            onMouseMove={trackGlow}
            className="glow float-card mb-6 flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 sm:flex-row sm:items-end dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
          >
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="imei">
                IMEI del dispositivo
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
                Modelo
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
              Agregar
            </button>
          </form>
          <p className="mb-6 -mt-4 text-xs text-slate-500 dark:text-slate-400">{modelProfile(model).summary}</p>
          {error && <p className="mb-6 -mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </>
      )}

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>}

      {!loading && devices.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no reclamaste ningún dispositivo.</p>
      )}

      {!loading && devices.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {SOURCE_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSourceFilter(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                sourceFilter === key
                  ? "brand-button"
                  : "bg-white text-slate-500 hover:bg-violet-100 dark:bg-[#111729] dark:text-slate-400 dark:hover:bg-white/10"
              }`}
            >
              {label} <span className="opacity-70">{counts[key]}</span>
            </button>
          ))}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar IMEI, modelo o placa…"
            className="field-input ml-auto w-full rounded-xl border border-slate-300 px-3 py-1.5 text-sm sm:w-64 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
      )}

      {!loading && devices.length > 0 && shown.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Ningún dispositivo coincide con el filtro.</p>
      )}

      {!loading && shown.length > 0 && (
        <div className="float-card overflow-x-auto rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-violet-100 bg-violet-50/60 text-xs text-slate-500 uppercase dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">IMEI</th>
                <th className="px-4 py-2 font-medium">Modelo</th>
                <th className="px-4 py-2 font-medium">Vehículo</th>
                <th className="px-4 py-2 font-medium">Fuente</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Última conexión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {shown.map((device) => (
                <tr
                  key={device.id}
                  onClick={() => navigate(`/dispositivos/${device.id}`)}
                  className="cursor-pointer hover:bg-violet-50/40 dark:hover:bg-white/5"
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    <Link to={`/dispositivos/${device.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                      {device.imei}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {device.model}
                    <ModelTags model={device.model} />
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {vehicleByDeviceId.get(device.id)?.name ?? <span className="text-slate-400">Sin asignar</span>}
                  </td>
                  <td className="px-4 py-3">
                    <DeviceSourceBadge source={device.source} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge lastSeenAt={device.lastSeenAt} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(device.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
