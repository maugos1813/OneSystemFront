import { CheckCircle2, Download, RefreshCw, Smartphone } from "lucide-react";
import { useAppUpdate } from "../context/AppUpdateContext";
import { useT } from "../i18n";
import { trackGlow } from "../lib/glow";

/**
 * "Aplicación Android" in the configuration: inside the app it shows the installed version and looks for a newer one;
 * in a normal browser it offers the app for download.
 */
export function AppUpdateCard() {
  const t = useT();
  const { isNative, installed, latest, available, checking, error, checkedAt, check, install } = useAppUpdate();
  const upToDate = isNative && !!installed && !!latest && !available && !!checkedAt && !error;

  return (
    <div
      onMouseMove={trackGlow}
      className="glow rounded-2xl border border-slate-200 p-4 sm:col-span-2 dark:border-white/10"
    >
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-slate-900 dark:text-white">{t("update.androidApp")}</p>
          {isNative ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("update.installedVersion", { version: installed ? `${installed.versionName} (${installed.versionCode})` : "…" })}
              {latest && t("update.latestVersion", { version: `${latest.versionName} (${latest.versionCode})` })}
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {latest ? t("update.downloadWithVersion", { version: latest.versionName }) : t("update.download")}
            </p>
          )}

          {available && latest?.notes && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{latest.notes}</p>}
          {upToDate && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> {t("update.upToDate")}
            </p>
          )}
          {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
          {available && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t("update.hint")}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {isNative && (
            <button
              type="button"
              onClick={() => void check()}
              disabled={checking}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} /> {t("update.check")}
            </button>
          )}
          {(available || (!isNative && latest)) && (
            <button
              type="button"
              onClick={() => void install()}
              className="brand-button flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium"
            >
              <Download className="h-4 w-4" /> {isNative ? t("alerts.install") : t("update.downloadApp")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
