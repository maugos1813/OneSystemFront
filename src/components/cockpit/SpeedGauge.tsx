const SIZE = 260;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SWEEP_FRACTION = 270 / 360; // 270° arc, 90° gap centered at the bottom
const MAX_SPEED = 180;

const STATE_LABEL: Record<string, string> = {
  off: "APAGADO",
  idle: "DETENIDO",
  moving: "EN MOVIMIENTO",
};

export function SpeedGauge({ speed, state }: { speed: number; state: "off" | "idle" | "moving" }) {
  const fraction = Math.min(speed / MAX_SPEED, 1);
  const trackLength = SWEEP_FRACTION * CIRCUMFERENCE;
  const valueLength = fraction * trackLength;

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <g transform={`rotate(135 ${SIZE / 2} ${SIZE / 2})`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#ede9fe"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${trackLength} ${CIRCUMFERENCE}`}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="url(#speedGaugeGradient)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${valueLength} ${CIRCUMFERENCE}`}
          />
        </g>
        <defs>
          <linearGradient id="speedGaugeGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute flex flex-col items-center">
        <span className="text-6xl font-bold text-slate-900 tabular-nums">{Math.round(speed)}</span>
        <span className="text-sm font-medium text-slate-400">km/h</span>
        <span className="mt-2 text-xs font-semibold tracking-wider text-violet-600">
          {STATE_LABEL[state]}
        </span>
      </div>
    </div>
  );
}
