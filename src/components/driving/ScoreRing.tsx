import { scoreColor } from "../../lib/drivingBehavior";
import { trackGlow } from "../../lib/glow";

const SIZE = 60;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ScoreRingProps {
  label: string;
  score: number;
  count: number;
  countLabel: string;
  active: boolean;
  onClick: () => void;
}

/** A single ring lives in its own floating card so a full row of them spreads edge to
 * edge — the active one "pops" forward with a bigger shadow and a slight lift. */
export function ScoreRing({ label, score, count, countLabel, active, onClick }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * CIRCUMFERENCE;
  const color = scoreColor(score);

  return (
    <button
      onClick={onClick}
      onMouseMove={trackGlow}
      className={`glow relative flex min-w-0 items-center gap-3 rounded-3xl border border-white bg-white p-4 text-left shadow-lg shadow-slate-200/50 transition-all duration-200 ${
        active ? "z-10 -translate-y-1 shadow-2xl shadow-slate-300/70 sm:scale-[1.04]" : "hover:-translate-y-0.5"
      }`}
    >
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
            />
          </g>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold tabular-nums text-slate-900">{score}%</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-sm leading-tight font-semibold text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs leading-tight text-slate-400">
          {count} {countLabel}
        </p>
      </div>
    </button>
  );
}
