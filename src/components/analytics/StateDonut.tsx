import type { StateDistributionEntry } from "../../lib/fleetStats";

const SIZE = 140;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const STATE_META: Record<StateDistributionEntry["state"], { label: string; color: string }> = {
  off: { label: "Apagado", color: "#f87171" },
  idle: { label: "Encendido, detenido", color: "#fbbf24" },
  moving: { label: "En movimiento", color: "#34d399" },
};

export function StateDonut({ entries }: { entries: StateDistributionEntry[] }) {
  const total = entries.reduce((sum, e) => sum + e.count, 0);

  let cumulative = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#ede9fe" strokeWidth={STROKE} />
          {total > 0 &&
            entries
              .filter((e) => e.count > 0)
              .map((entry) => {
                const dash = (entry.count / total) * CIRCUMFERENCE;
                const circle = (
                  <circle
                    key={entry.state}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={STATE_META[entry.state].color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
                    strokeDashoffset={-cumulative}
                  />
                );
                cumulative += dash;
                return circle;
              })}
        </g>
        <text
          x={SIZE / 2}
          y={SIZE / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-900 text-2xl font-semibold"
        >
          {total}
        </text>
      </svg>

      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.state} className="flex items-center gap-2 text-sm text-slate-700">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STATE_META[entry.state].color }}
            />
            {STATE_META[entry.state].label}
            <span className="text-slate-400">{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
