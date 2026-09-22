import { isOffline } from "../lib/alerts";

export function StatusBadge({ lastSeenAt }: { lastSeenAt: string | null }) {
  const online = !isOffline(lastSeenAt);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        online ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-slate-400"}`} />
      {online ? "En línea" : "Desconectado"}
    </span>
  );
}
