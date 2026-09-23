import { CheckCircle2 } from "lucide-react";
import { INCIDENT_COLORS, INCIDENT_LABELS, type Incident } from "../../lib/drivingBehavior";

interface IncidentListProps {
  incidents: Incident[];
  activeIndex: number | null;
  onSelect: (index: number) => void;
}

export function IncidentList({ incidents, activeIndex, onSelect }: IncidentListProps) {
  if (incidents.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600">
        <CheckCircle2 className="h-4 w-4" />
        Sin incidentes en este rango.
      </div>
    );
  }

  // Newest first for reading, but keep each item's original index so the map stays in sync.
  const ordered = incidents.map((incident, index) => ({ incident, index })).reverse();

  return (
    <ul className="max-h-80 space-y-1 overflow-y-auto pr-1 lg:max-h-none">
      {ordered.map(({ incident, index }) => (
        <li key={index}>
          <button
            onClick={() => onSelect(index)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
              activeIndex === index ? "bg-slate-100" : "hover:bg-slate-50"
            }`}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: INCIDENT_COLORS[incident.type] }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-900">
                {INCIDENT_LABELS[incident.type]}
              </span>
              <span className="block truncate text-xs text-slate-400">{incident.detail}</span>
            </span>
            <span className="shrink-0 text-xs text-slate-400 tabular-nums">
              {new Date(incident.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
