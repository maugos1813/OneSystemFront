import type { Position } from "../lib/types";

const WIDTH = 280;
const HEIGHT = 70;
const PADDING = 4;

function buildPath(positions: Position[]): { line: string; area: string; maxSpeed: number } {
  const times = positions.map((p) => new Date(p.ts).getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeSpan = maxTime - minTime || 1;
  const maxSpeed = Math.max(...positions.map((p) => p.speed), 1);

  const points = positions.map((p) => {
    const x = PADDING + ((new Date(p.ts).getTime() - minTime) / timeSpan) * (WIDTH - PADDING * 2);
    const y = HEIGHT - PADDING - (p.speed / maxSpeed) * (HEIGHT - PADDING * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const line = `M${points.join(" L")}`;
  const area = `${line} L${WIDTH - PADDING},${HEIGHT - PADDING} L${PADDING},${HEIGHT - PADDING} Z`;

  return { line, area, maxSpeed };
}

export function SpeedChart({ positions }: { positions: Position[] }) {
  if (positions.length < 2) {
    return <p className="text-sm text-slate-400">No hay suficientes datos en este rango.</p>;
  }

  const { line, area, maxSpeed } = buildPath(positions);
  const speeds = positions.map((p) => p.speed);
  const avg = Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length);

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none">
        <path d={area} fill="#dbeafe" />
        <path d={line} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>Máx {maxSpeed} km/h</span>
        <span>Prom {avg} km/h</span>
      </div>
    </div>
  );
}
