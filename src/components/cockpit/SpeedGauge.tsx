// Logical coordinate space for the SVG viewBox — the actual rendered size is
// responsive (set by the wrapping container), this just needs enough margin around
// the ring so tick labels never get clipped regardless of how large it's displayed.
const VIEWBOX = 380;
const CENTER = VIEWBOX / 2;
const STROKE = 20;
const RADIUS = 125;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SWEEP_DEG = 270; // 270° arc, 90° gap centered at the bottom
const SWEEP_FRACTION = SWEEP_DEG / 360;
const MAX_SPEED = 240;
const MAJOR_STEP = 40;
const MINOR_STEP = 20;

const STATE_LABEL: Record<string, string> = {
  off: "APAGADO",
  idle: "DETENIDO",
  moving: "EN MOVIMIENTO",
};

const ARC_OUTER = RADIUS + STROKE / 2;

/** Position on the gauge for a given speed value, as a compass angle (0 = top, clockwise). */
function angleForSpeed(speed: number): number {
  return -135 + (speed / MAX_SPEED) * SWEEP_DEG;
}

function polarPoint(compassDeg: number, radius: number): { x: number; y: number } {
  const rad = (compassDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.sin(rad), y: CENTER - radius * Math.cos(rad) };
}

function Tick({ speed }: { speed: number }) {
  const isMajor = speed % MAJOR_STEP === 0;
  const angle = angleForSpeed(speed);
  const inner = ARC_OUTER + 4;
  const outer = inner + (isMajor ? 10 : 5);
  const p1 = polarPoint(angle, inner);
  const p2 = polarPoint(angle, outer);

  return (
    <>
      <line
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={isMajor ? "#a78bfa" : "#ddd6fe"}
        strokeWidth={isMajor ? 2 : 1.5}
        strokeLinecap="round"
      />
      {isMajor && (
        <text
          {...polarPoint(angle, outer + 16)}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-400 text-[13px] font-medium"
        >
          {speed}
        </text>
      )}
    </>
  );
}

export function SpeedGauge({ speed, state }: { speed: number; state: "off" | "idle" | "moving" }) {
  const fraction = Math.min(speed / MAX_SPEED, 1);
  const trackLength = SWEEP_FRACTION * CIRCUMFERENCE;
  const valueLength = fraction * trackLength;

  const ticks: number[] = [];
  for (let v = 0; v <= MAX_SPEED; v += MINOR_STEP) ticks.push(v);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="h-full w-full overflow-visible">
        <g transform={`rotate(135 ${CENTER} ${CENTER})`}>
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="#ede9fe"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${trackLength} ${CIRCUMFERENCE}`}
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="url(#speedGaugeGradient)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${valueLength} ${CIRCUMFERENCE}`}
          />
        </g>
        {ticks.map((v) => (
          <Tick key={v} speed={v} />
        ))}
        <defs>
          <linearGradient id="speedGaugeGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold text-slate-900 tabular-nums">{Math.round(speed)}</span>
        <span className="text-sm font-medium text-slate-400">km/h</span>
        <span className="mt-2 text-xs font-semibold tracking-wider text-violet-600">
          {STATE_LABEL[state]}
        </span>
      </div>
    </div>
  );
}
