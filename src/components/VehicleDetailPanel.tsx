import { X } from "lucide-react";
import { AVL_ID, type DeviceEvent, type Position, type Vehicle } from "../lib/types";
import { SpeedChart } from "./SpeedChart";

interface VehicleDetailPanelProps {
  vehicle: Vehicle;
  position: Position | null;
  events: DeviceEvent[];
  history: Position[];
  historyRangeHours: number | null;
  onHistoryRangeChange: (hours: number | null) => void;
  onClose: () => void;
}

const HISTORY_RANGES: Array<{ label: string; hours: number | null }> = [
  { label: "Sin recorrido", hours: null },
  { label: "24h", hours: 24 },
  { label: "7 días", hours: 24 * 7 },
];

function formatRelativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `hace ${seconds}s`;
  if (seconds < 3600) return `hace ${Math.round(seconds / 60)}min`;
  if (seconds < 86400) return `hace ${Math.round(seconds / 3600)}h`;
  return `hace ${Math.round(seconds / 86400)}d`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

function eventLabel(event: DeviceEvent): string {
  if (event.type === "ignition_change") {
    const on = event.payload[AVL_ID.IGNITION] === 1 || event.payload[AVL_ID.IGNITION] === "1";
    return on ? "Ignición encendida" : "Ignición apagada";
  }
  if (event.type === "movement_change") return "Cambio de movimiento";
  return event.type;
}

export function VehicleDetailPanel({
  vehicle,
  position,
  events,
  history,
  historyRangeHours,
  onHistoryRangeChange,
  onClose,
}: VehicleDetailPanelProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 max-h-[75vh] overflow-y-auto rounded-t-3xl border border-white bg-white p-4 shadow-xl shadow-slate-300/30 sm:absolute sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-auto sm:max-h-[calc(100%-2rem)] sm:w-80 sm:rounded-3xl">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">{vehicle.name}</h2>
          {vehicle.plate && <p className="text-xs text-slate-500">{vehicle.plate}</p>}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Cerrar">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!position && <p className="text-sm text-slate-500">Todavía no hay posiciones registradas.</p>}

      {position && (
        <div className="divide-y divide-slate-100">
          <Row label="Velocidad" value={`${position.speed} km/h`} />
          <Row
            label="Ignición"
            value={
              position.ioData[AVL_ID.IGNITION] === 1 || position.ioData[AVL_ID.IGNITION] === "1"
                ? "Encendida"
                : "Apagada"
            }
          />
          <Row
            label="Voltaje externo"
            value={`${(Number(position.ioData[AVL_ID.EXTERNAL_VOLTAGE] ?? 0) / 1000).toFixed(1)} V`}
          />
          <Row label="Satélites" value={String(position.satellites)} />
          <Row label="Última posición" value={formatRelativeTime(position.ts)} />
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Recorrido</p>
        <div className="flex gap-1.5">
          {HISTORY_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => onHistoryRangeChange(range.hours)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                historyRangeHours === range.hours
                  ? "brand-button"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {historyRangeHours !== null && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Velocidad
            </p>
            <SpeedChart positions={history} />
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
          Actividad reciente
        </p>
        {events.length === 0 && <p className="text-sm text-slate-400">Sin eventos registrados.</p>}
        <ul className="space-y-2">
          {events.slice(0, 8).map((event) => (
            <li key={event.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{eventLabel(event)}</span>
              <span className="text-xs text-slate-400">{formatRelativeTime(event.ts)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
