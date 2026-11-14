import { Link2Off } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../../i18n";
import { disconnectApp, listConnectedApps, type ConnectedApp } from "../../lib/api";
import { Panel } from "../analytics/Panel";

/** The apps that can read this person's vehicles ("Sign in with OneTrack"), with the date they were connected and a way to disconnect each. */
export function ConnectedApps() {
  const { t, locale } = useLanguage();
  const [apps, setApps] = useState<ConnectedApp[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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

  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
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
            <li key={app.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{app.clientName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("settings.connectedApps.since", { date: date.format(new Date(app.connectedAt)) })}</p>
              </div>
              <button
                type="button"
                disabled={busy === app.id}
                onClick={() => void revoke(app)}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                <Link2Off className="h-4 w-4" />
                {t("settings.connectedApps.revoke")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
