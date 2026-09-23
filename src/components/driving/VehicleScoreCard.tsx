import { scoreColor, scoreGrade, type CategoryScores } from "../../lib/drivingBehavior";
import { trackGlow } from "../../lib/glow";

const METRICS: Array<{ key: keyof CategoryScores["counts"]; label: string; unit: string }> = [
  { key: "harshBraking", label: "Frenadas bruscas", unit: "frenadas" },
  { key: "harshAcceleration", label: "Aceleración brusca", unit: "aceleraciones" },
  { key: "harshCornering", label: "Curvas bruscas", unit: "curvas" },
  { key: "speeding", label: "Exceso de velocidad", unit: "excesos" },
];

function MetricBar({ label, score, count, unit }: { label: string; score: number; count: number; unit: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: scoreColor(score) }}>
          {score}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: scoreColor(score) }}
        />
      </div>
      <p className="mt-0.5 text-xs text-slate-400">
        {count} {unit}
      </p>
    </div>
  );
}

interface VehicleScoreCardProps {
  vehicleName: string;
  plate: string | null;
  scores: CategoryScores;
}

export function VehicleScoreCard({ vehicleName, plate, scores }: VehicleScoreCardProps) {
  return (
    <div
      onMouseMove={trackGlow}
      className="glow float-card rounded-3xl border border-white bg-white p-5 shadow-lg shadow-slate-200/50"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">{vehicleName}</h3>
          {plate && <p className="text-xs text-slate-400">{plate}</p>}
        </div>
        <div
          className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl text-white"
          style={{ backgroundColor: scoreColor(scores.overall) }}
        >
          <span className="text-lg leading-none font-bold">{scores.overall}</span>
          <span className="text-[9px] font-medium opacity-90">{scoreGrade(scores.overall)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {METRICS.map(({ key, label, unit }) => (
          <MetricBar key={key} label={label} score={scores[key]} count={scores.counts[key]} unit={unit} />
        ))}
      </div>
    </div>
  );
}
