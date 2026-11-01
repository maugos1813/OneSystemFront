import { useEffect, useState } from "react";
import { useT, type Translate } from "../i18n";
import { listMaintenance, listVehicleOdometers } from "../lib/api";
import type { Alert } from "../lib/alerts";
import { formatKm } from "../lib/maintenance";
import type { MaintenancePlan, Vehicle, VehicleOdometerRow } from "../lib/types";

const REFRESH_MS = 5 * 60 * 1000;
const isTagliando = (plan: MaintenancePlan) => plan.name.trim().toLowerCase() === "tagliando";

/** The urgent first: past due, then close, then what is missing for the count to work at all. */
const ORDER = ["overdue", "due", "soon", "noKm", "none", "recheck"] as const;
type Kind = (typeof ORDER)[number];

/**
 * What needs attention about each vehicle's tagliando: it is past due or close to the 20 000 km, it was never entered, the
 * vehicle's km are not known so nothing can be counted, or the km have not been checked against the dashboard for a while.
 */
export function tagliandoNotices(
  vehicles: readonly Vehicle[],
  plans: ReadonlyMap<string, MaintenancePlan>,
  odometers: ReadonlyMap<string, VehicleOdometerRow>,
  t: Translate,
): Alert[] {
  const notices: Array<{ kind: Kind; alert: Alert }> = [];
  for (const vehicle of vehicles) {
    const plan = plans.get(vehicle.id);
    const odometer = odometers.get(vehicle.id);
    const name = vehicle.plate ?? vehicle.name;
    const remaining = plan?.status.kmRemaining ?? null;

    let kind: Kind | null = null;
    let message = "";
    if (!plan || plan.lastDoneKm === null) {
      kind = "none";
      message = t("alerts.tagliandoNone", { name });
    } else if (remaining === null) {
      kind = "noKm";
      message = t("alerts.tagliandoNoKm", { name });
    } else if (plan.status.state === "overdue") {
      kind = "overdue";
      message = t("alerts.tagliandoOverdue", { name, km: formatKm(Math.abs(remaining)) });
    } else if (plan.status.state === "due") {
      kind = "due";
      message = t("alerts.tagliandoDue", { name, km: formatKm(remaining) });
    } else if (plan.status.state === "soon") {
      kind = "soon";
      message = t("alerts.tagliandoSoon", { name, km: formatKm(remaining) });
    } else if (odometer?.needsCheck) {
      kind = "recheck";
      message = t("alerts.tagliandoRecheck", { name });
    }
    if (kind) {
      notices.push({ kind, alert: { vehicleId: vehicle.id, vehicleName: vehicle.name, type: "tagliando", message, link: `/vehiculos/${vehicle.id}?tab=mantenimiento` } });
    }
  }
  return notices.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)).map((n) => n.alert);
}

/** The tagliando notices of the vehicles a person sees, refreshed every few minutes. Nothing is fetched while `enabled` is false. */
export function useTagliandoNotices(vehicles: Vehicle[], enabled: boolean): Alert[] {
  const t = useT();
  const [data, setData] = useState<{ plans: Map<string, MaintenancePlan>; odometers: Map<string, VehicleOdometerRow> } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () =>
      Promise.all([listMaintenance(), listVehicleOdometers()])
        .then(([maintenance, odometers]) => {
          if (cancelled) return;
          const plans = new Map<string, MaintenancePlan>();
          for (const row of maintenance) {
            const plan = row.plans.find(isTagliando);
            if (plan) plans.set(row.vehicleId, plan);
          }
          setData({ plans, odometers: new Map(odometers.map((o) => [o.vehicleId, o])) });
        })
        .catch(() => undefined); // the notices just stay as they were until the next look
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled]);

  return enabled && data ? tagliandoNotices(vehicles, data.plans, data.odometers, t) : [];
}
