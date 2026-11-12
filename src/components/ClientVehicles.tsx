import { ChevronRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useT } from "../i18n";
import { ApiError, assignVehicleDevice, createClientVehicle } from "../lib/api";
import type { PlatformOrganizationDetail } from "../lib/types";

/** OneSystec's side of the vehicles of a client: it gives each one its device, from the ones it handed over to that client. */
export function ClientVehicles({ detail, onChanged }: { detail: PlatformOrganizationDetail; onChanged: () => Promise<void> }) {
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // An older backend (a moment in the middle of a deploy) does not send the list yet: show it empty instead of breaking the screen.
  const vehicleList = detail.vehicleList ?? [];
  const assignedElsewhere = new Set(vehicleList.map((v) => v.deviceId).filter(Boolean));
  const label = (d: PlatformOrganizationDetail["deviceList"][number]) => `${d.model} · ${d.imei}`;

  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [newDevice, setNewDevice] = useState("");
  const free = detail.deviceList.filter((d) => !assignedElsewhere.has(d.id));

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy("new");
    setMessage(null);
    try {
      await createClientVehicle(detail.id, { name: name.trim(), plate: plate.trim() || undefined, deviceId: newDevice || undefined });
      setName("");
      setPlate("");
      setNewDevice("");
      await onChanged();
      setMessage({ ok: true, text: t("platform.vehicleCreated") });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError && err.message ? err.message : t("platform.err.createVehicle") });
    } finally {
      setBusy(null);
    }
  }

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
        {t("platform.vehicles", { count: vehicleList.length })}
      </summary>
      <div className="mt-2">
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t("platform.vehiclesHint")}</p>
        {vehicleList.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">{t("platform.noneM")}</p>
        ) : (
          <ul className="space-y-2">
            {vehicleList.map((v) => (
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
        <form onSubmit={(e) => void create(e)} className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row dark:border-white/10">
          <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder={t("platform.vehicleName")} className="field-input min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
          <input value={plate} onChange={(e) => setPlate(e.target.value)} maxLength={20} placeholder={t("common.plate")} className="field-input rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-32 dark:border-white/10 dark:bg-white/5 dark:text-white" />
          <select value={newDevice} onChange={(e) => setNewDevice(e.target.value)} aria-label={t("common.device")} className="field-input rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-60 dark:border-white/10 dark:bg-white/5 dark:text-white">
            <option value="">{t("platform.noDevice")}</option>
            {free.map((d) => (
              <option key={d.id} value={d.id}>
                {label(d)}
              </option>
            ))}
          </select>
          <button type="submit" disabled={busy === "new"} className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60">
            {t("platform.addVehicle")}
          </button>
        </form>
        {message && <p className={`mt-2 text-xs ${message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{message.text}</p>}
      </div>
    </details>
  );
}
