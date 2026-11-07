import { useT } from "../i18n";
import { isOffline } from "../lib/alerts";
import type { VehicleStatus } from "../lib/vehicleStatus";

export function StatusBadge({ lastSeenAt }: { lastSeenAt: string | null }) {
  const t = useT();
  const online = !isOffline(lastSeenAt);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        online
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
          : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-slate-400"}`} />
      {online ? t("status.online") : t("status.offline")}
    </span>
  );
}

const STATUS_STYLE: Record<VehicleStatus | "idling", { pill: string; dot: string; label: "status.moving" | "status.stopped" | "status.idling" | "status.offline" }> = {
  moving: { pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400", dot: "bg-emerald-500", label: "status.moving" },
  stopped: { pill: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300", dot: "bg-sky-500", label: "status.stopped" },
  idling: { pill: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", dot: "bg-amber-500", label: "status.idling" },
  offline: { pill: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400", dot: "bg-red-500", label: "status.offline" },
};

/** What the vehicle is doing: moving, stopped (the engine off, or on and idling) or no signal — which is the one that raises alerts. */
export function VehicleStatusBadge({ status, idling = false }: { status: VehicleStatus; idling?: boolean }) {
  const t = useT();
  const style = STATUS_STYLE[status === "stopped" && idling ? "idling" : status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${style.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {t(style.label)}
    </span>
  );
}
