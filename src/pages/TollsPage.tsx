import { ExternalLink, Flag, Receipt } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AreaFilterPills } from "../components/AreaFilterPills";
import { Panel } from "../components/analytics/Panel";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { flagTollPassage, listTollPassages } from "../lib/api";
import type { TollPassage } from "../lib/types";

const RANGES: Array<{ label: string; hours: number }> = [
  { label: "24h", hours: 24 },
  { label: "7 días", hours: 24 * 7 },
  { label: "30 días", hours: 24 * 30 },
];

const PAGE_SIZE = 200;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TollsPage() {
  const { currentUser } = useAuth();
  const { filteredVehicles } = useFleet();
  const canFlag = currentUser?.role === "owner" || currentUser?.role === "admin";

  const [rangeHours, setRangeHours] = useState(24 * 7);
  const [vehicleId, setVehicleId] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [passages, setPassages] = useState<TollPassage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (offset: number) => {
      const from = new Date(Date.now() - rangeHours * 60 * 60 * 1000);
      const rows = await listTollPassages({
        from,
        vehicleId: vehicleId || undefined,
        flaggedOnly,
        limit: PAGE_SIZE,
        offset,
      });
      setHasMore(rows.length === PAGE_SIZE);
      return rows;
    },
    [rangeHours, vehicleId, flaggedOnly],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load(0)
      .then((rows) => {
        if (cancelled) return;
        setPassages(rows);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudieron cargar los peajes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function handleLoadMore() {
    try {
      const rows = await load(passages.length);
      setPassages((current) => [...current, ...rows]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar más peajes");
    }
  }

  async function handleToggleFlag(passage: TollPassage) {
    const next = !passage.flagged;
    setPassages((current) => current.map((p) => (p.id === passage.id ? { ...p, flagged: next } : p)));
    try {
      await flagTollPassage(passage.id, next);
    } catch (err) {
      setPassages((current) => current.map((p) => (p.id === passage.id ? { ...p, flagged: passage.flagged } : p)));
      setError(err instanceof Error ? err.message : "No se pudo actualizar el paso");
    }
  }

  const visibleVehicleIds = useMemo(() => new Set(filteredVehicles.map((v) => v.id)), [filteredVehicles]);
  const visible = useMemo(
    () => passages.filter((p) => visibleVehicleIds.has(p.vehicleId)),
    [passages, visibleVehicleIds],
  );

  const flaggedCount = visible.filter((p) => p.flagged).length;
  const vehicleCount = new Set(visible.map((p) => p.vehicleId)).size;

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0e1a]">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Peajes</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Pasos por peaje detectados a partir del recorrido GPS de cada vehículo. Indica por dónde pasó, no si se pagó
        o si llegó un "mancato pagamento".
      </p>

      <div className="mb-4">
        <AreaFilterPills />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRangeHours(r.hours)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              r.hours === rangeHours
                ? "bg-slate-900 text-white dark:bg-blue-600"
                : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-[#111729] dark:text-slate-400 dark:hover:bg-white/10"
            }`}
          >
            {r.label}
          </button>
        ))}

        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />

        <select
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="field-input rounded-xl border border-slate-300 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <option value="">Todos los vehículos</option>
          {filteredVehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate ?? v.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Solo indebidos
        </label>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs font-medium">
        <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
          {visible.length} pasos
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {vehicleCount} vehículos
        </span>
        <span className="rounded-full bg-red-100 px-3 py-1 text-red-700 dark:bg-red-500/15 dark:text-red-300">
          {flaggedCount} indebidos
        </span>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Cargando peajes...</p>}

      {!loading && visible.length === 0 && !error && (
        <div className="glow float-card flex flex-col items-center gap-2 rounded-3xl border border-white bg-white p-10 text-center shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <Receipt className="h-8 w-8 text-emerald-500" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Sin pasos por peaje en este rango.</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <Panel title="Pasos detectados">
          <div className="-mx-2 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-violet-100 text-xs text-slate-500 uppercase dark:border-white/10 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Vehículo</th>
                  <th className="px-3 py-2 font-medium">Peaje</th>
                  <th className="px-3 py-2 font-medium">Ubicación</th>
                  <th className="px-3 py-2 text-right font-medium">Indebido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {visible.map((p) => (
                  <tr key={p.id} className={p.flagged ? "bg-red-50/60 dark:bg-red-500/5" : undefined}>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 tabular-nums dark:text-slate-300">
                      {formatDateTime(p.ts)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-slate-900 dark:text-white">{p.plate ?? p.vehicleName}</span>
                      {p.fleetGroup && (
                        <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">{p.fleetGroup}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-slate-900 dark:text-white">{p.plazaName}</span>
                      {p.operator && (
                        <span className="block text-xs text-slate-400 dark:text-slate-500">{p.operator}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <a
                        href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline dark:text-violet-400"
                      >
                        Ver en mapa
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {canFlag ? (
                        <button
                          onClick={() => handleToggleFlag(p)}
                          aria-pressed={p.flagged}
                          title={p.flagged ? "Quitar marca de indebido" : "Marcar como indebido"}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                            p.flagged
                              ? "bg-red-600 text-white hover:bg-red-700"
                              : "bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:bg-white/10 dark:text-slate-400 dark:hover:bg-red-500/10"
                          }`}
                        >
                          <Flag className="h-3 w-3" />
                          {p.flagged ? "Indebido" : "Marcar"}
                        </button>
                      ) : (
                        p.flagged && (
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
                            Indebido
                          </span>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <button
              onClick={handleLoadMore}
              className="mt-4 w-full rounded-xl bg-slate-100 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              Cargar más
            </button>
          )}
        </Panel>
      )}
    </div>
  );
}
