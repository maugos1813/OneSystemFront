import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDuration } from "../../lib/geo";
import { scoreColor } from "../../lib/drivingBehavior";

export interface FleetRow {
  vehicleId: string;
  name: string;
  plate: string | null;
  score: number;
  events: number;
  distanceKm: number;
  trips: number;
  durationMs: number;
}

type SortKey = "score" | "name" | "trips" | "distanceKm" | "durationMs" | "events";
type Tier = "alto" | "medio" | "bajo";

function tierOf(score: number): Tier {
  if (score >= 75) return "alto";
  if (score >= 40) return "medio";
  return "bajo";
}

const TIER_META: Record<Tier, { label: string; color: string }> = {
  alto: { label: "Score alto", color: "#16a34a" },
  medio: { label: "Score medio", color: "#f59e0b" },
  bajo: { label: "Score bajo", color: "#dc2626" },
};

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: "asc" | "desc";
  onClick: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = activeKey === sortKey;
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className={`px-4 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 transition hover:text-slate-900 ${active ? "text-slate-900" : ""}`}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}

interface FleetScoreTableProps {
  rows: FleetRow[];
  categoryLabel: string;
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
}

/** Compares every vehicle in the fleet on whichever metric is currently selected up in
 * the rings — a search box, a score-tier filter, sortable columns, and a jump-to-vehicle
 * button per row that hands off to the map + incident list above. */
export function FleetScoreTable({ rows, categoryLabel, selectedVehicleId, onSelectVehicle }: FleetScoreTableProps) {
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<Tier | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const tierCounts = useMemo(() => {
    const counts: Record<Tier, number> = { alto: 0, medio: 0, bajo: 0 };
    for (const row of rows) counts[tierOf(row.score)]++;
    return counts;
  }, [rows]);

  const totals = useMemo(
    () => ({
      events: rows.reduce((sum, r) => sum + r.events, 0),
      distanceKm: Math.round(rows.reduce((sum, r) => sum + r.distanceKm, 0)),
      trips: rows.reduce((sum, r) => sum + r.trips, 0),
    }),
    [rows],
  );

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (tierFilter !== "all" && tierOf(r.score) !== tierFilter) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || (r.plate ?? "").toLowerCase().includes(q);
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      return (a[sortKey] - b[sortKey]) * dir;
    });
  }, [rows, query, tierFilter, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white bg-white p-3 shadow-sm shadow-slate-200/50">
          {(Object.keys(TIER_META) as Tier[]).map((tier) => (
            <div key={tier} className="flex items-center justify-between px-1 py-1.5 text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: TIER_META[tier].color }} />
                {TIER_META[tier].label}
              </span>
              <span className="font-semibold tabular-nums text-slate-900">{tierCounts[tier]}</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-white bg-white p-3 shadow-sm shadow-slate-200/50">
          <div className="flex items-center justify-between px-1 py-1.5 text-sm">
            <span className="text-slate-600">Eventos ({categoryLabel})</span>
            <span className="font-semibold tabular-nums text-slate-900">{totals.events}</span>
          </div>
          <div className="flex items-center justify-between px-1 py-1.5 text-sm">
            <span className="text-slate-600">Distancia (km)</span>
            <span className="font-semibold tabular-nums text-slate-900">{totals.distanceKm}</span>
          </div>
          <div className="flex items-center justify-between px-1 py-1.5 text-sm">
            <span className="text-slate-600">Viajes</span>
            <span className="font-semibold tabular-nums text-slate-900">{totals.trips}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por vehículo o patente..."
            className="field-input w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as Tier | "all")}
          className="field-input rounded-xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">Todos los niveles</option>
          <option value="alto">Score alto</option>
          <option value="medio">Score medio</option>
          <option value="bajo">Score bajo</option>
        </select>
      </div>

      <div className="float-card overflow-x-auto rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-violet-100 bg-violet-50/60 text-xs text-slate-500 uppercase">
            <tr>
              <SortHeader label="Score" sortKey="score" activeKey={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Vehículo" sortKey="name" activeKey={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader
                label="Viajes"
                sortKey="trips"
                activeKey={sortKey}
                dir={sortDir}
                onClick={toggleSort}
                align="right"
              />
              <SortHeader
                label="Distancia (km)"
                sortKey="distanceKm"
                activeKey={sortKey}
                dir={sortDir}
                onClick={toggleSort}
                align="right"
              />
              <SortHeader
                label="Duración"
                sortKey="durationMs"
                activeKey={sortKey}
                dir={sortDir}
                onClick={toggleSort}
                align="right"
              />
              <SortHeader
                label="Eventos"
                sortKey="events"
                activeKey={sortKey}
                dir={sortDir}
                onClick={toggleSort}
                align="right"
              />
              <th className="px-4 py-2 text-right font-medium">Ver detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row) => (
              <tr key={row.vehicleId} style={{ boxShadow: `inset 4px 0 0 0 ${scoreColor(row.score)}` }}>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white tabular-nums"
                    style={{ backgroundColor: scoreColor(row.score) }}
                  >
                    {row.score}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{row.name}</p>
                  {row.plate && <p className="text-xs text-slate-400">{row.plate}</p>}
                </td>
                <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{row.trips}</td>
                <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{row.distanceKm}</td>
                <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                  {formatDuration(row.durationMs)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{row.events}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onSelectVehicle(row.vehicleId)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      row.vehicleId === selectedVehicleId
                        ? "brand-button"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                  Ningún vehículo coincide con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
