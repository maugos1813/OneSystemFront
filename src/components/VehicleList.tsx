import { PanelLeftClose } from "lucide-react";
import { trackGlow } from "../lib/glow";
import type { Device, Vehicle } from "../lib/types";
import { StatusBadge } from "./StatusBadge";

interface VehicleListProps {
  vehicles: Vehicle[];
  devices: Device[];
  selectedVehicleId: string | null;
  onSelect: (vehicleId: string) => void;
  /** Below `lg` there's no room for the list next to the map, so it's an off-canvas drawer there. */
  open: boolean;
  onClose: () => void;
}

function isOffCanvasSize(): boolean {
  return typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches;
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
      {open && <div className="fixed inset-0 z-20 bg-slate-900/30 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-30 max-w-[85vw] overflow-hidden border-r border-violet-100 bg-white transition-all duration-200 lg:static lg:z-auto ${
          open
            ? "w-80 translate-x-0 lg:w-72"
            : "w-80 -translate-x-full lg:w-0 lg:translate-x-0 lg:border-transparent"
        }`}
      >
        <div className="flex h-full w-80 flex-col overflow-y-auto lg:w-72">
          <div className="flex items-center justify-between border-b border-violet-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Vehículos</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-slate-700"
              aria-label="Ocultar lista"
            >
              <PanelLeftClose className="h-4 w-4" />
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
                  if (isOffCanvasSize()) onClose();
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
        </div>
      </aside>
    </>
  );
}
