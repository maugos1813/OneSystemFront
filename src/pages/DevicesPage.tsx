import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { StatusBadge } from "../components/StatusBadge";
import { useFleet } from "../context/FleetContext";
import { ApiError, claimDevice } from "../lib/api";

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
      <h1 className="text-xl font-semibold text-slate-900">Dispositivos</h1>
      <p className="mb-6 text-sm text-slate-500">Los trackers GPS vinculados a tu empresa.</p>

      <form
        onSubmit={handleClaim}
        className="mb-6 flex flex-col gap-3 rounded-xl border border-violet-100 bg-white p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="imei">
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Reclamar
        </button>
      </form>
      {error && <p className="mb-6 -mt-4 text-sm text-red-600">{error}</p>}

      {loading && <p className="text-sm text-slate-500">Cargando...</p>}

      {!loading && devices.length === 0 && (
        <p className="text-sm text-slate-500">Todavía no reclamaste ningún dispositivo.</p>
      )}

      {!loading && devices.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-violet-100 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-violet-100 bg-violet-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">IMEI</th>
                <th className="px-4 py-2 font-medium">Modelo</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Última conexión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devices.map((device) => (
                <tr key={device.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{device.imei}</td>
                  <td className="px-4 py-3 text-slate-600">{device.model}</td>
                  <td className="px-4 py-3">
                    <StatusBadge lastSeenAt={device.lastSeenAt} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(device.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
