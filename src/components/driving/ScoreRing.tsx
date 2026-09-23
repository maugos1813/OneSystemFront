import { scoreColor } from "../../lib/drivingBehavior";

interface ScoreRingProps {
  label: string;
  score: number;
  active: boolean;
  onClick: () => void;
  size?: number;
}

export function ScoreRing({ label, score, active, onClick, size = 88 }: ScoreRingProps) {
  const stroke = size >= 110 ? 11 : 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const color = scoreColor(score);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl p-3 transition hover:bg-white/70"
      style={
        active
          ? { backgroundColor: "white", boxShadow: `0 0 0 2px ${color}, 0 12px 28px -14px rgba(15,23,42,0.25)` }
          : undefined
      }
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
            />
          </g>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold tabular-nums text-slate-900" style={size >= 110 ? { fontSize: "1.5rem" } : undefined}>
            {score}%
          </span>
        </div>
      </div>
      <span className="max-w-[7rem] text-center text-xs font-medium text-slate-600">{label}</span>
    </button>
  );
}
