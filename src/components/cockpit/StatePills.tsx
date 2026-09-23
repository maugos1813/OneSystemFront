import type { VehicleState } from "../../lib/fleetStats";

const OPTIONS: Array<{ state: VehicleState; label: string }> = [
  { state: "off", label: "Apagado" },
  { state: "idle", label: "Detenido" },
  { state: "moving", label: "Moviendo" },
];

export function StatePills({ current }: { current: VehicleState }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Estado</p>
      <div className="flex flex-col gap-1.5 rounded-2xl bg-violet-50 p-1.5">
        {OPTIONS.map((opt) => (
          <div
            key={opt.state}
            className={`rounded-xl px-4 py-1.5 text-center text-xs font-medium transition ${
              opt.state === current ? "brand-button" : "text-slate-400"
            }`}
          >
            {opt.label}
          </div>
        ))}
      </div>
    </div>
  );
}
