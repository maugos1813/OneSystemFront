import { X } from "lucide-react";
import { trackGlow } from "../lib/glow";
import type { Device, Vehicle } from "../lib/types";
import { StatusBadge } from "./StatusBadge";

interface VehicleListProps {
  vehicles: Vehicle[];
  devices: Device[];
  selectedVehicleId: string | null;
  onSelect: (vehicleId: string) => void;
  /** Below `md`, the list is an off-canvas drawer instead of a static column. */
  open: boolean;
  onClose: () => void;
}

export function VehicleList({
  vehicles,
  devices,
  selectedVehicleId,
  onSelect,
  open,
  onClose,
}: VehicleListProps) {
  const deviceById = new Map(devices.map((d) => [d.id, d]));

  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-slate-900/30 md:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-80 max-w-[85vw] shrink-0 flex-col overflow-y-auto border-r border-violet-100 bg-white transition-transform duration-200 md:static md:z-auto md:w-72 md:max-w-none md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-violet-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Vehículos</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-violet-50 md:hidden"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
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
              onClick={() => {
                onSelect(vehicle.id);
                onClose();
              }}
              onMouseMove={trackGlow}
              className={`glow flex w-full flex-col gap-1 border-b border-slate-100 px-4 py-3 text-left transition ${
                selected ? "brand-gradient-soft" : "hover:bg-slate-50"
              }`}
            >
              <span className="font-medium text-slate-900">{vehicle.name}</span>
              {vehicle.plate && <span className="text-xs text-slate-500">{vehicle.plate}</span>}
              <StatusBadge lastSeenAt={device?.lastSeenAt ?? null} />
            </button>
          );
        })}
      </aside>
    </>
  );
}
