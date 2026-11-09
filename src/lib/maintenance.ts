import { currentLocale, type MessageKey } from "../i18n";
import type { MaintenancePlan, MaintenanceState } from "./types";

/** The word for each state, as a translation key (show it with t()). */
export const STATE_LABEL: Record<MaintenanceState, MessageKey> = {
  ok: "maint.state.ok",
  soon: "maint.state.soon",
  due: "maint.state.due",
  overdue: "maint.state.overdue",
  unknown: "maint.state.unknown",
};

export const STATE_BADGE: Record<MaintenanceState, string> = {
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  soon: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  due: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  unknown: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};

export const STATE_BAR: Record<MaintenanceState, string> = {
  ok: "bg-emerald-500",
  soon: "bg-orange-500",
  due: "bg-red-500",
  overdue: "bg-red-500",
  unknown: "bg-slate-300 dark:bg-slate-600",
};

/** The edge of a vehicle's card: orange when a service is near, red when it is about to be due or already is. */
export const STATE_EDGE: Record<MaintenanceState, string> = {
  ok: "border-l-4 border-l-emerald-500",
  soon: "border-l-4 border-l-orange-500",
  due: "border-l-4 border-l-red-500",
  overdue: "border-l-4 border-l-red-500",
  unknown: "",
};

const STATE_ORDER: Record<MaintenanceState, number> = { overdue: 0, due: 1, soon: 2, ok: 3, unknown: 4 };

/** The most urgent state among a vehicle's plans ("unknown" when it has none). */
export function worstState(plans: readonly Pick<MaintenancePlan, "status">[]): MaintenanceState {
  return plans.reduce<MaintenanceState>((worst, plan) => (STATE_ORDER[plan.status.state] < STATE_ORDER[worst] ? plan.status.state : worst), "unknown");
}

export const formatKm = (km: number) => `${km.toLocaleString(currentLocale())} km`;
