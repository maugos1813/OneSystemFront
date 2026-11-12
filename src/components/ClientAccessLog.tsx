import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../i18n";
import { listClientAccessLog, type AccessLogEntry } from "../lib/api";

/** Who of OneSystec went into this client's account and what they changed there (opened, managed, each change). */
export function ClientAccessLog({ orgId }: { orgId: string }) {
  const { t, locale } = useLanguage();
  const [entries, setEntries] = useState<AccessLogEntry[] | null>(null);

  useEffect(() => {
    let alive = true;
    listClientAccessLog(orgId)
      .then((list) => alive && setEntries(list))
      .catch(() => alive && setEntries([]));
    return () => {
      alive = false;
    };
  }, [orgId]);

  const when = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });
  const what = (e: AccessLogEntry) =>
    e.action === "view" ? t("platform.log.view") : e.action === "manage" ? t("platform.log.manage") : (e.detail ?? t("platform.log.write"));

  return (
    <details className="group rounded-xl border border-slate-200 p-3 dark:border-white/10">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
        <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
        {t("platform.log.title", { count: entries?.length ?? 0 })}
      </summary>
      <div className="mt-2">
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t("platform.log.hint")}</p>
        {entries === null ? (
          <p className="text-slate-500 dark:text-slate-400">{t("common.loading")}</p>
        ) : entries.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">{t("platform.noneM")}</p>
        ) : (
          <ul className="space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-2">
                <span className="text-slate-500 dark:text-slate-400">{when.format(new Date(e.createdAt))}</span>
                <span>{e.userEmail ?? "—"}</span>
                <span className={e.action === "write" ? "font-mono text-amber-700 dark:text-amber-300" : "font-medium"}>{what(e)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
