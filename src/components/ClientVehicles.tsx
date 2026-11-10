import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useT } from "../i18n";
import { ApiError, assignVehicleDevice } from "../lib/api";
import type { PlatformOrganizationDetail } from "../lib/types";

/** OneSystec's side of the vehicles of a client: it gives each one its device, from the ones it handed over to that client. */
export function ClientVehicles({ detail, onChanged }: { detail: PlatformOrganizationDetail; onChanged: () => Promise<void> }) {
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const assignedElsewhere = new Set(detail.vehicleList.map((v) => v.deviceId).filter(Boolean));
  const label = (d: PlatformOrganizationDetail["deviceList"][number]) => `${d.model} · ${d.imei}`;

  async function change(vehicleId: string, deviceId: string) {
    setBusy(vehicleId);
    setMessage(null);
    try {
      await assignVehicleDevice(detail.id, vehicleId, deviceId || null);
      await onChanged();
      setMessage({ ok: true, text: t("platform.vehicleSaved") });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError && err.message ? err.message : t("platform.err.assignDevice") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <details className="group rounded-xl border border-slate-200 p-3 dark:border-white/10">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
        <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
        {t("platform.vehicles", { count: detail.vehicleList.length })}
      </summary>
      <div className="mt-2">
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t("platform.vehiclesHint")}</p>
        {detail.vehicleList.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">{t("platform.noneM")}</p>
        ) : (
          <ul className="space-y-2">
            {detail.vehicleList.map((v) => (
              <li key={v.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-300">
                  <span className="font-medium">{v.plate ?? v.name}</span>
                  {v.plate && <span className="ml-2 text-slate-500 dark:text-slate-400">{v.name}</span>}
                  {v.fleetGroup && <span className="ml-2 text-xs text-slate-400">{v.fleetGroup}</span>}
                </span>
                <select
                  value={v.deviceId ?? ""}
                  disabled={busy === v.id}
                  onChange={(e) => void change(v.id, e.target.value)}
                  aria-label={t("common.device")}
                  className="field-input rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:opacity-60 sm:w-72 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="">{t("platform.noDevice")}</option>
                  {detail.deviceList
                    .filter((d) => d.id === v.deviceId || !assignedElsewhere.has(d.id))
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {label(d)}
                      </option>
                    ))}
                </select>
              </li>
            ))}
          </ul>
        )}
        {message && <p className={`mt-2 text-xs ${message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{message.text}</p>}
      </div>
    </details>
  );
}
