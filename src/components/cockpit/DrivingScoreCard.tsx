import type { DrivingScore, HarshEvent } from "../../lib/drivingStyle";

export function DrivingScoreCard({ score, events }: { score: DrivingScore; events: HarshEvent[] }) {
  const braking = events.filter((e) => e.type === "braking").length;
  const acceleration = events.filter((e) => e.type === "acceleration").length;
  const cornering = events.filter((e) => e.type === "cornering").length;

  return (
    <div className="flex items-center gap-4">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white"
        style={{ backgroundColor: score.color }}
      >
        {score.grade}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">Estilo de manejo — hoy</p>
        <p className="text-xs text-slate-400">
          {braking} frenadas · {acceleration} aceleraciones · {cornering} curvas bruscas
        </p>
      </div>
      <span className="shrink-0 text-2xl font-semibold text-slate-900">{score.score}</span>
    </div>
  );
}
