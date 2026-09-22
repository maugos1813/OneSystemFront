const SIZE = 110;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MAX_EVENTS_SHOWN = 10;

export function GForceGauge({ eventCount }: { eventCount: number }) {
  const fraction = Math.min(eventCount / MAX_EVENTS_SHOWN, 1);
  const color = eventCount === 0 ? "#22c55e" : eventCount <= 3 ? "#f59e0b" : "#dc2626";

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Eventos bruscos</p>
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#ede9fe" strokeWidth={STROKE} />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            />
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-900">{eventCount}</span>
          <span className="text-[10px] text-slate-400">hoy</span>
        </div>
      </div>
    </div>
  );
}
