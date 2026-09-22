import type { Device, Vehicle } from "../lib/types";
import { StatusBadge } from "./StatusBadge";

interface VehicleListProps {
  vehicles: Vehicle[];
  devices: Device[];
  selectedVehicleId: string | null;
  onSelect: (vehicleId: string) => void;
}

export function VehicleList({ vehicles, devices, selectedVehicleId, onSelect }: VehicleListProps) {
  const deviceById = new Map(devices.map((d) => [d.id, d]));

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Vehículos</h2>
      </div>

      {vehicles.length === 0 && (
        <p className="p-4 text-sm text-slate-500">No hay vehículos cargados todavía.</p>
      )}

      {vehicles.map((vehicle) => {
        const device = vehicle.deviceId ? deviceById.get(vehicle.deviceId) : undefined;
        const selected = vehicle.id === selectedVehicleId;

        return (
          <button
            key={vehicle.id}
            onClick={() => onSelect(vehicle.id)}
            className={`flex w-full flex-col gap-1 border-b border-slate-100 px-4 py-3 text-left transition ${
              selected ? "bg-blue-50" : "hover:bg-slate-50"
            }`}
          >
            <span className="font-medium text-slate-900">{vehicle.name}</span>
            {vehicle.plate && <span className="text-xs text-slate-500">{vehicle.plate}</span>}
            <StatusBadge lastSeenAt={device?.lastSeenAt ?? null} />
          </button>
        );
      })}
    </aside>
  );
}
