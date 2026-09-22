import { Route } from "lucide-react";

export function MileageCard({ label, km }: { label: string; km: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm shadow-violet-100">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
        <Route className="h-5 w-5" />
      </div>
      <div>
        <p className="text-lg font-semibold text-slate-900">{km.toLocaleString()} km</p>
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</p>
      </div>
    </div>
  );
}
