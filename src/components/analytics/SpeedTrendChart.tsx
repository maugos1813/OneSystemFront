import type { HourlySpeedPoint } from "../../hooks/useFleetSpeedTrend";

const WIDTH = 600;
const HEIGHT = 140;
const PADDING = 8;

export function SpeedTrendChart({ points }: { points: HourlySpeedPoint[] }) {
  if (points.length < 2) {
    return <p className="text-sm text-slate-400">Sin datos suficientes todavía hoy.</p>;
  }

  const maxSpeed = Math.max(...points.map((p) => p.avgSpeed), 1);
  const stepX = (WIDTH - PADDING * 2) / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = PADDING + i * stepX;
    const y = HEIGHT - PADDING - (p.avgSpeed / maxSpeed) * (HEIGHT - PADDING * 2);
    return { x, y };
  });

  const line = `M${coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" L")}`;
  const area = `${line} L${coords[coords.length - 1]!.x},${HEIGHT - PADDING} L${coords[0]!.x},${HEIGHT - PADDING} Z`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="speedTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#speedTrendFill)" />
      <path d={line} fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinejoin="round" />
      {points.map((p, i) => (
        <text
          key={p.hour}
          x={coords[i]!.x}
          y={HEIGHT}
          textAnchor="middle"
          className="fill-slate-400 text-[9px]"
        >
          {i % 3 === 0 ? `${p.hour}h` : ""}
        </text>
      ))}
    </svg>
  );
}
