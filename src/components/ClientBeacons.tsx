import { ChevronRight, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useT } from "../i18n";
import { ApiError, assignBeaconToClient, listClientBeacons, removeClientBeacon } from "../lib/api";
import type { DriverBeacon } from "../lib/types";

const INPUT =
  "field-input min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white";

/** OneSystec's side of the EYE Beacons: it hands them to a client by the MAC on the label (the client cannot do it itself). */
export function ClientBeacons({ orgId }: { orgId: string }) {
  const t = useT();
  const [beacons, setBeacons] = useState<DriverBeacon[]>([]);
  const [mac, setMac] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    listClientBeacons(orgId)
      .then((list) => alive && setBeacons(list))
      .catch(() => alive && setBeacons([]));
    return () => {
      alive = false;
    };
  }, [orgId]);

  async function assign(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await assignBeaconToClient(orgId, mac.trim(), name.trim());
      setMac("");
      setName("");
      setMessage({ ok: true, text: t("platform.beaconAdded") });
      setBeacons(await listClientBeacons(orgId));
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError && err.message ? err.message : t("platform.err.beacon") });
    } finally {
      setSaving(false);
    }
  }

  async function remove(beacon: DriverBeacon) {
    if (!confirm(t("beacons.confirmRemove", { name: beacon.driverName }))) return;
    await removeClientBeacon(orgId, beacon.id);
    setBeacons(await listClientBeacons(orgId));
  }

  return (
    <details className="group rounded-xl border border-slate-200 p-3 dark:border-white/10">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
        <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
        {t("platform.beacons", { count: beacons.length })}
      </summary>
      <div className="mt-2">
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t("platform.beaconsHint")}</p>
        {beacons.length > 0 && (
          <ul className="mb-2 space-y-0.5">
            {beacons.map((b) => (
              <li key={b.id} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="min-w-0 flex-1 truncate">
                  {b.driverName} · <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{b.beaconId.split("-").pop()}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void remove(b)}
                  aria-label={t("platform.beaconRemove")}
                  title={t("platform.beaconRemove")}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={(e) => void assign(e)} className="flex flex-col gap-2 sm:flex-row">
          <input required value={mac} onChange={(e) => setMac(e.target.value)} placeholder="7C:D9:F4:0B:39:E3" maxLength={17} aria-label="MAC" className={`${INPUT} font-mono`} />
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("platform.beaconDriver")} maxLength={100} className={INPUT} />
          <button type="submit" disabled={saving} className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60">
            {t("platform.beaconAssign")}
          </button>
        </form>
        {message && <p className={`mt-1 text-xs ${message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{message.text}</p>}
      </div>
    </details>
  );
}
