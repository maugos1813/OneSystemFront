import { ChevronRight, ExternalLink, Flag, Receipt } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AreaFilterPills } from "../components/AreaFilterPills";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { flagTollPassage, listTollMonths, listTollPassages, type TollFilters } from "../lib/api";
import { trackGlow } from "../lib/glow";
import type { TollMonthSummary, TollPassage } from "../lib/types";

const PAGE_SIZE = 200;

interface MonthData {
  rows: TollPassage[];
  hasMore: boolean;
  loading: boolean;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const label = new Date(Date.UTC(year!, monthNumber! - 1, 1)).toLocaleDateString("es", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function PassageTable({
  rows,
  canFlag,
  onToggleFlag,
}: {
  rows: TollPassage[];
  canFlag: boolean;
  onToggleFlag: (passage: TollPassage) => void;
}) {
  return (
    <div className="overflow-x-auto">
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
          {rows.map((p) => (
            <tr key={p.id} className={p.flagged ? "bg-red-50/60 dark:bg-red-500/5" : undefined}>
              <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 tabular-nums dark:text-slate-300">
                {formatDateTime(p.ts)}
              </td>
              <td className="px-3 py-2.5">
                <span className="font-medium text-slate-900 dark:text-white">{p.plate ?? p.vehicleName}</span>
                {p.fleetGroup && <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">{p.fleetGroup}</span>}
              </td>
              <td className="px-3 py-2.5">
                <span className="text-slate-900 dark:text-white">{p.plazaName}</span>
                {!p.confirmed && (
                  <span
                    title="No había posiciones cerca de las barreras para comprobar que el vehículo frenó en el peaje"
                    className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  >
                    Sin confirmar
                  </span>
                )}
                {p.operator && <span className="block text-xs text-slate-400 dark:text-slate-500">{p.operator}</span>}
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
                    onClick={() => onToggleFlag(p)}
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
  );
}

export function TollsPage() {
  const { currentUser } = useAuth();
  const { filteredVehicles, selectedArea } = useFleet();
  const canFlag = currentUser?.role === "owner" || currentUser?.role === "admin";

  const [vehicleId, setVehicleId] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [months, setMonths] = useState<TollMonthSummary[] | null>(null);
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [monthData, setMonthData] = useState<Record<string, MonthData>>({});
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo<TollFilters>(
    () => ({ vehicleId: vehicleId || undefined, fleetGroup: selectedArea ?? undefined, flaggedOnly }),
    [vehicleId, selectedArea, flaggedOnly],
  );

  // Bumped whenever the filters change, so a slow response for the old filters is ignored.
  const generation = useRef(0);

  const loadMonth = useCallback(
    async (month: string, offset: number, gen: number) => {
      setMonthData((current) => ({
        ...current,
        [month]: { rows: current[month]?.rows ?? [], hasMore: false, loading: true },
      }));
      try {
        const rows = await listTollPassages({ ...filters, month, limit: PAGE_SIZE, offset });
        if (gen !== generation.current) return;
        setMonthData((current) => ({
          ...current,
          [month]: {
            rows: offset === 0 ? rows : [...(current[month]?.rows ?? []), ...rows],
            hasMore: rows.length === PAGE_SIZE,
            loading: false,
          },
        }));
      } catch (err) {
        if (gen !== generation.current) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar los peajes");
        setMonthData((current) => {
          const { [month]: _failed, ...rest } = current;
          return rest;
        });
      }
    },
    [filters],
  );

  useEffect(() => {
    const gen = ++generation.current;
    setMonths(null);
    setMonthData({});
    setOpenMonths(new Set());
    setError(null);

    listTollMonths(filters)
      .then((summaries) => {
        if (gen !== generation.current) return;
        setMonths(summaries);
        // Only the most recent month opens by default; every other one stays collapsed
        // (and unfetched) until it's opened.
        const latest = summaries[0];
        if (latest) {
          setOpenMonths(new Set([latest.month]));
          void loadMonth(latest.month, 0, gen);
        }
      })
      .catch((err: unknown) => {
        if (gen !== generation.current) return;
        setMonths([]);
        setError(err instanceof Error ? err.message : "No se pudieron cargar los peajes");
      });
  }, [filters, loadMonth]);

  function toggleMonth(month: string) {
    const isOpen = openMonths.has(month);
    setOpenMonths((current) => {
      const next = new Set(current);
      if (isOpen) next.delete(month);
      else next.add(month);
      return next;
    });
    if (!isOpen && !monthData[month]) void loadMonth(month, 0, generation.current);
  }

  async function handleToggleFlag(month: string, passage: TollPassage) {
    const next = !passage.flagged;
    const apply = (flagged: boolean) => {
      setMonthData((current) => {
        const data = current[month];
        if (!data) return current;
        return { ...current, [month]: { ...data, rows: data.rows.map((p) => (p.id === passage.id ? { ...p, flagged } : p)) } };
      });
      setMonths((current) =>
        current?.map((m) => (m.month === month ? { ...m, flagged: m.flagged + (flagged ? 1 : -1) } : m)) ?? current,
      );
    };

    apply(next);
    try {
      await flagTollPassage(passage.id, next);
    } catch (err) {
      apply(passage.flagged);
      setError(err instanceof Error ? err.message : "No se pudo actualizar el paso");
    }
  }

  const totals = useMemo(
    () => ({
      passages: months?.reduce((sum, m) => sum + m.total, 0) ?? 0,
      flagged: months?.reduce((sum, m) => sum + m.flagged, 0) ?? 0,
    }),
    [months],
  );

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0e1a]">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Peajes</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Pasos por peaje detectados a partir del recorrido GPS de cada vehículo, agrupados por mes. Indica por dónde
        pasó, no si se pagó o si llegó un "mancato pagamento". Un paso "sin confirmar" es probable, pero faltaban
        posiciones cerca del peaje para comprobar que el vehículo frenó en él.
      </p>

      <div className="mb-4">
        <AreaFilterPills />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
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

        {months && (
          <span className="ml-auto flex gap-2 text-xs font-medium">
            <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              {totals.passages} pasos
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-700 dark:bg-red-500/15 dark:text-red-300">
              {totals.flagged} indebidos
            </span>
          </span>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      {months === null && <p className="text-sm text-slate-500 dark:text-slate-400">Cargando peajes...</p>}

      {months?.length === 0 && !error && (
        <div className="glow float-card flex flex-col items-center gap-2 rounded-3xl border border-white bg-white p-10 text-center shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <Receipt className="h-8 w-8 text-emerald-500" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Sin pasos por peaje registrados.</p>
        </div>
      )}

      <div className="space-y-3">
        {months?.map((m) => {
          const isOpen = openMonths.has(m.month);
          const data = monthData[m.month];
          return (
            <div
              key={m.month}
              onMouseMove={trackGlow}
              className="glow float-card rounded-3xl border border-white bg-white shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
            >
              <button
                onClick={() => toggleMonth(m.month)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-4 text-left sm:px-6"
              >
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                />
                <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">{monthLabel(m.month)}</span>
                <span className="flex flex-wrap justify-end gap-2 text-xs font-medium">
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                    {m.total} pasos
                  </span>
                  <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 sm:inline dark:bg-white/10 dark:text-slate-300">
                    {m.vehicles} vehículos
                  </span>
                  {m.flagged > 0 && (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700 dark:bg-red-500/15 dark:text-red-300">
                      {m.flagged} indebidos
                    </span>
                  )}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 px-2 pt-2 pb-4 sm:px-4 dark:border-white/5">
                  {data && data.rows.length > 0 && (
                    <PassageTable rows={data.rows} canFlag={canFlag} onToggleFlag={(p) => handleToggleFlag(m.month, p)} />
                  )}
                  {(!data || (data.loading && data.rows.length === 0)) && (
                    <p className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">Cargando...</p>
                  )}
                  {data?.hasMore && (
                    <button
                      onClick={() => loadMonth(m.month, data.rows.length, generation.current)}
                      disabled={data.loading}
                      className="mt-3 w-full rounded-xl bg-slate-100 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      Cargar más
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
