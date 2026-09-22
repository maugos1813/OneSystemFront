import type { OdometerEntry } from "../../lib/fleetStats";

export function OdometerRanking({ entries }: { entries: OdometerEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-400">Sin vehículos todavía.</p>;
  }

  const max = Math.max(...entries.map((e) => e.km), 1);

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.vehicleId}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-700">{entry.vehicleName}</span>
            <span className="text-slate-400">{entry.km.toLocaleString()} km</span>
          </div>
          <div className="h-2 rounded-full bg-violet-100">
            <div
              className="h-2 rounded-full bg-violet-600"
              style={{ width: `${(entry.km / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
