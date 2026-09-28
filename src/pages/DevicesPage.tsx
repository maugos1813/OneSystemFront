import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { StatusBadge } from "../components/StatusBadge";
import { useFleet } from "../context/FleetContext";
import { ApiError, claimDevice } from "../lib/api";
import { trackGlow } from "../lib/glow";

function formatDate(iso: string | null): string {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString();
}

export function DevicesPage() {
  const { devices, loading, refetch } = useFleet();
  const [imei, setImei] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await claimDevice(imei.trim());
      setImei("");
      refetch();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? "No se encontró un dispositivo libre con ese IMEI"
          : "No se pudo reclamar el dispositivo",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Dispositivos</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Los trackers GPS vinculados a tu empresa.</p>

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
        <button
          type="submit"
          disabled={submitting}
          className="brand-button flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Reclamar
        </button>
      </form>
      {error && <p className="mb-6 -mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>}

      {!loading && devices.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no reclamaste ningún dispositivo.</p>
      )}

      {!loading && devices.length > 0 && (
        <div className="float-card overflow-x-auto rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-violet-100 bg-violet-50/60 text-xs text-slate-500 uppercase dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">IMEI</th>
                <th className="px-4 py-2 font-medium">Modelo</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Última conexión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {devices.map((device) => (
                <tr key={device.id}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{device.imei}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{device.model}</td>
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
