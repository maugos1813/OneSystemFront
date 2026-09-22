import type { HourlySpeedPoint } from "../../hooks/useFleetSpeedTrend";

const WIDTH = 600;
const HEIGHT = 200;
const PADDING = 8;

function smoothPath(coords: Array<{ x: number; y: number }>): string {
  let d = `M${coords[0]!.x},${coords[0]!.y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i]!;
    const next = coords[i + 1]!;
    const mx = (curr.x + next.x) / 2;
    const my = (curr.y + next.y) / 2;
    d += ` Q${curr.x},${curr.y} ${mx},${my}`;
  }
  const last = coords[coords.length - 1]!;
  d += ` L${last.x},${last.y}`;
  return d;
}

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

  const line = smoothPath(coords);
  const area = `${line} L${coords[coords.length - 1]!.x},${HEIGHT - PADDING} L${coords[0]!.x},${HEIGHT - PADDING} Z`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="speedTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.28} />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="speedTrendStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#speedTrendFill)" />
      <path d={line} fill="none" stroke="url(#speedTrendStroke)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
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
