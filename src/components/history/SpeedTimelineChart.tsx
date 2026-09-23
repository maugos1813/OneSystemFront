import { useRef, type MouseEvent } from "react";
import type { Position } from "../../lib/types";

const WIDTH = 700;
const HEIGHT = 200;
const PAD_X = 12;
const PAD_TOP = 18;
const PAD_BOTTOM = 26;
const LABEL_COUNT = 5;

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

interface SpeedTimelineChartProps {
  positions: Position[];
  speedLimit: number;
  currentIndex: number;
  onSeek: (index: number) => void;
}

export function SpeedTimelineChart({ positions, speedLimit, currentIndex, onSeek }: SpeedTimelineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  if (positions.length < 2) {
    return <p className="text-sm text-slate-400">No hay datos suficientes para graficar.</p>;
  }

  const times = positions.map((p) => new Date(p.ts).getTime());
  const minTime = times[0]!;
  const timeSpan = Math.max(times[times.length - 1]! - minTime, 1);
  const maxSpeed = Math.max(...positions.map((p) => p.speed), speedLimit) * 1.15;

  const xFor = (i: number) => PAD_X + ((times[i]! - minTime) / timeSpan) * (WIDTH - PAD_X * 2);
  const yFor = (speed: number) => HEIGHT - PAD_BOTTOM - (speed / maxSpeed) * (HEIGHT - PAD_TOP - PAD_BOTTOM);

  const coords = positions.map((p, i) => ({ x: xFor(i), y: yFor(p.speed) }));
  const line = smoothPath(coords);
  const area = `${line} L${coords[coords.length - 1]!.x},${HEIGHT - PAD_BOTTOM} L${coords[0]!.x},${HEIGHT - PAD_BOTTOM} Z`;
  const limitY = yFor(speedLimit);
  const playhead = coords[currentIndex] ?? coords[0]!;
  const playheadOverLimit = (positions[currentIndex]?.speed ?? 0) > speedLimit;

  const violationPoints = positions
    .map((p, i) => ({ i, speed: p.speed }))
    .filter(({ speed }) => speed > speedLimit);

  const labelIndices = Array.from({ length: LABEL_COUNT }, (_, k) =>
    Math.round((k / (LABEL_COUNT - 1)) * (positions.length - 1)),
  );

  function handleClick(e: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * WIDTH;

    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const d = Math.abs(coords[i]!.x - clickX);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    onSeek(nearest);
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full cursor-pointer"
      preserveAspectRatio="none"
      onClick={handleClick}
    >
      <defs>
        <linearGradient id="historySpeedFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.22} />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="historySpeedStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      <rect
        x={PAD_X}
        y={PAD_TOP}
        width={WIDTH - PAD_X * 2}
        height={Math.max(limitY - PAD_TOP, 0)}
        fill="#ef4444"
        fillOpacity={0.06}
      />
      <line x1={PAD_X} y1={limitY} x2={WIDTH - PAD_X} y2={limitY} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 4" />
      <text x={PAD_X} y={Math.max(limitY - 6, PAD_TOP - 4)} className="fill-red-500 text-[10px] font-semibold">
        Límite {speedLimit} km/h
      </text>

      <path d={area} fill="url(#historySpeedFill)" />
      <path
        d={line}
        fill="none"
        stroke="url(#historySpeedStroke)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {violationPoints.map(({ i }) => (
        <circle key={i} cx={coords[i]!.x} cy={coords[i]!.y} r={2.5} fill="#dc2626" />
      ))}

      <line
        x1={playhead.x}
        y1={PAD_TOP}
        x2={playhead.x}
        y2={HEIGHT - PAD_BOTTOM}
        stroke="#0f172a"
        strokeWidth={1.5}
        strokeOpacity={0.3}
      />
      <circle
        cx={playhead.x}
        cy={playhead.y}
        r={5.5}
        fill={playheadOverLimit ? "#dc2626" : "#7c3aed"}
        stroke="#fff"
        strokeWidth={2}
      />

      {labelIndices.map((i) => (
        <text key={i} x={coords[i]!.x} y={HEIGHT - 8} textAnchor="middle" className="fill-slate-400 text-[9px]">
          {new Date(positions[i]!.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </text>
      ))}
    </svg>
  );
}
