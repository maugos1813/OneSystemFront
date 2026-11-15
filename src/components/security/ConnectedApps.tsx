import { Car, Link2Off, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../i18n";
import { disconnectApp, getAppVehicles, listConnectedApps, setAppVehicles, type ConnectedApp, type AppVehicle } from "../../lib/api";
import { Panel } from "../analytics/Panel";
import { fleetFormat } from "../../lib/time";

/** Which vehicles one app sees: all of them (new ones included) or only the ones the person ticks. */
function VehiclePicker({ app, onClose, onSaved }: { app: ConnectedApp; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState<AppVehicle[] | null>(null);
  const [all, setAll] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAppVehicles(app.id)
      .then((result) => {
        if (cancelled) return;
        setVehicles(result.vehicles);
        setAll(result.all);
        setPicked(new Set(result.vehicles.filter((v) => v.shared).map((v) => v.id)));
      })
      .catch(() => {
        if (!cancelled) setVehicles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [app.id]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return vehicles ?? [];
    return (vehicles ?? []).filter((v) => [v.plate, v.name, v.organization, v.fleetGroup].some((field) => field?.toLowerCase().includes(needle)));
  }, [vehicles, query]);

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const setMany = (ids: string[], on: boolean) =>
    setPicked((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  async function save() {
    setSaving(true);
    setFailed(false);
    try {
      await setAppVehicles(app.id, all ? null : [...picked]);
      onSaved();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  const RADIO = "flex cursor-pointer items-start gap-2 text-sm text-slate-700 dark:text-slate-200";
  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{app.clientName}</p>
        <button type="button" onClick={onClose} aria-label={t("common.close")} className="rounded-full p-1 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </div>
      {vehicles === null ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</p>
      ) : vehicles.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("settings.connectedApps.noVehicles")}</p>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className={RADIO}>
              <input type="radio" name={`mode-${app.id}`} checked={all} onChange={() => setAll(true)} className="mt-0.5" />
              {t("settings.connectedApps.modeAll")}
            </label>
            <label className={RADIO}>
              <input type="radio" name={`mode-${app.id}`} checked={!all} onChange={() => setAll(false)} className="mt-0.5" />
              {t("settings.connectedApps.modeSome")}
            </label>
          </div>
          {!all && (
            <div className="mt-3">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("settings.connectedApps.search")}
                className="field-input mb-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
              <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400">{t("settings.connectedApps.selected", { count: picked.size, total: vehicles.length })}</span>
                <button type="button" onClick={() => setMany(visible.map((v) => v.id), true)} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                  {t("settings.connectedApps.selectAll")}
                </button>
                <button type="button" onClick={() => setMany(visible.map((v) => v.id), false)} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                  {t("settings.connectedApps.selectNone")}
                </button>
              </div>
              <ul className="max-h-72 divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-[#0a0e1a]">
                {visible.map((v) => (
                  <li key={v.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5">
                      <input type="checkbox" checked={picked.has(v.id)} onChange={() => toggle(v.id)} />
                      <Car className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{v.plate}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{[v.organization, v.fleetGroup, v.name].filter(Boolean).join(" · ")}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("settings.connectedApps.newNotice")}</p>
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-xl bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {t("common.save")}
            </button>
            {failed && <span className="text-xs text-red-600 dark:text-red-400">{t("settings.connectedApps.error")}</span>}
          </div>
        </>
      )}
    </div>
  );
}

/** The apps that can read this person's vehicles ("Sign in with OneTrack"), with the date they were connected and a way to disconnect each. */
export function ConnectedApps() {
  const { t, locale } = useLanguage();
  const [apps, setApps] = useState<ConnectedApp[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [choosing, setChoosing] = useState<string | null>(null);

  const load = () =>
    listConnectedApps()
      .then(setApps)
      .catch(() => setApps([]));
  useEffect(() => {
    void load();
  }, []);

  async function revoke(app: ConnectedApp) {
    if (!confirm(t("settings.connectedApps.confirm", { app: app.clientName }))) return;
    setBusy(app.id);
    try {
      await disconnectApp(app.id);
      await load();
    } finally {
      setBusy(null);
    }
  }

  const date = fleetFormat(locale, { dateStyle: "medium" });
  return (
    <Panel title={t("settings.connectedApps")}>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t("settings.connectedApps.hint")}</p>
      {apps === null ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</p>
      ) : apps.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("settings.connectedApps.none")}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {apps.map((app) => (
            <li key={app.id} className="py-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="min-w-[12rem] flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{app.clientName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("settings.connectedApps.since", { date: date.format(new Date(app.connectedAt)) })}</p>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {app.sharedVehicles === null ? t("settings.connectedApps.sharingAll") : t("settings.connectedApps.sharingSome", { count: app.sharedVehicles })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setChoosing(choosing === app.id ? null : app.id)}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                >
                  <Car className="h-4 w-4" />
                  {t("settings.connectedApps.choose")}
                </button>
                <button
                  type="button"
                  disabled={busy === app.id}
                  onClick={() => void revoke(app)}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  <Link2Off className="h-4 w-4" />
                  {t("settings.connectedApps.revoke")}
                </button>
              </div>
              {choosing === app.id && (
                <VehiclePicker
                  app={app}
                  onClose={() => setChoosing(null)}
                  onSaved={() => {
                    setChoosing(null);
                    void load();
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
