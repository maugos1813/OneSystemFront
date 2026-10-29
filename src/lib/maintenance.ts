import type { MaintenanceState, PlanStatus } from "./types";

export const STATE_LABEL: Record<MaintenanceState, string> = {
  ok: "Al día",
  soon: "Próximo",
  due: "Muy próximo",
  overdue: "Vencido",
  unknown: "Sin datos",
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

export const formatKm = (km: number) => `${km.toLocaleString("es-AR")} km`;

/** "Faltan 4.200 km · 83 días", "Vencido hace 320 km", … — what is left, for either limit. */
export function describeRemaining(status: PlanStatus): string {
  const parts: string[] = [];
  if (status.kmRemaining !== null) {
    parts.push(status.kmRemaining >= 0 ? `faltan ${formatKm(status.kmRemaining)}` : `pasado por ${formatKm(-status.kmRemaining)}`);
  }
  if (status.daysRemaining !== null) {
    const days = status.daysRemaining;
    parts.push(days > 1 ? `faltan ${days} días` : days === 1 ? "vence mañana" : days === 0 ? "vence hoy" : `venció hace ${-days} ${days === -1 ? "día" : "días"}`);
  }
  if (parts.length === 0) return "Sin lecturas de kilometraje todavía";
  const text = parts.join(" · ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface PlanTemplate {
  name: string;
  intervalKm: number | null;
  intervalMonths: number | null;
}

/** Common services as starting points; every number can be changed in the form. The tagliando, every 20 000 km, is the first. */
export const PLAN_TEMPLATES: PlanTemplate[] = [
  { name: "Tagliando", intervalKm: 20000, intervalMonths: null },
  { name: "Cambio de aceite y filtros", intervalKm: 15000, intervalMonths: 12 },
  { name: "Revisión periódica (Revisione)", intervalKm: null, intervalMonths: 24 },
  { name: "Neumáticos", intervalKm: 40000, intervalMonths: null },
  { name: "Frenos (pastillas y discos)", intervalKm: 30000, intervalMonths: null },
  { name: "Correa de distribución", intervalKm: 120000, intervalMonths: 60 },
  { name: "Seguro", intervalKm: null, intervalMonths: 12 },
];
