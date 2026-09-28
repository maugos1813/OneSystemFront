import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { SpeedViolation } from "../../lib/speedTimeline";

interface ViolationsListProps {
  violations: SpeedViolation[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function ViolationsList({ violations, activeIndex, onSelect }: ViolationsListProps) {
  if (violations.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        Sin excesos de velocidad en este recorrido.
      </div>
    );
  }

  return (
    <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
      {violations.map((v) => (
        <li key={v.index}>
          <button
            onClick={() => onSelect(v.index)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
              v.index === activeIndex
                ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5"
            }`}
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500 dark:text-red-400" />
              {new Date(v.ts).toLocaleTimeString()}
            </span>
            <span className="font-semibold text-red-600 tabular-nums dark:text-red-400">
              {Math.round(v.speed)} km/h
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
