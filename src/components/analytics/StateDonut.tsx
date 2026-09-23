import type { StateDistributionEntry } from "../../lib/fleetStats";

const SIZE = 150;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 6; // small visual gap between segments

const STATE_META: Record<StateDistributionEntry["state"], { label: string; color: string }> = {
  off: { label: "Apagado", color: "#f87171" },
  idle: { label: "Encendido, detenido", color: "#fbbf24" },
  moving: { label: "En movimiento", color: "url(#donutMovingGradient)" },
};

export function StateDonut({ entries }: { entries: StateDistributionEntry[] }) {
  const total = entries.reduce((sum, e) => sum + e.count, 0);
  const active = entries.filter((e) => e.count > 0);

  let cumulative = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
        <defs>
          <linearGradient id="donutMovingGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
          {total > 0 &&
            active.map((entry) => {
              const dash = (entry.count / total) * CIRCUMFERENCE - GAP;
              const circle = (
                <circle
                  key={entry.state}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={STATE_META[entry.state].color}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${Math.max(dash, 0)} ${CIRCUMFERENCE}`}
                  strokeDashoffset={-cumulative}
                />
              );
              cumulative += (entry.count / total) * CIRCUMFERENCE;
              return circle;
            })}
        </g>
        <text
          x={SIZE / 2}
          y={SIZE / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-900 text-3xl font-semibold"
        >
          {total}
        </text>
      </svg>

      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.state} className="flex items-center gap-2 text-sm text-slate-600">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background:
                  entry.state === "moving" ? "linear-gradient(135deg,#818cf8,#7c3aed)" : STATE_META[entry.state].color,
              }}
            />
            {STATE_META[entry.state].label}
            <span className="text-slate-400">{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
