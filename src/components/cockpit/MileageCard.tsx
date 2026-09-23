import { Route } from "lucide-react";
import { trackGlow } from "../../lib/glow";

export function MileageCard({ label, km }: { label: string; km: number }) {
  return (
    <div
      onMouseMove={trackGlow}
      className="glow float-card flex h-full items-center gap-3 rounded-3xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50"
    >
      <div className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
        <Route className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-slate-900">{km.toLocaleString()} km</p>
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</p>
      </div>
    </div>
  );
}
