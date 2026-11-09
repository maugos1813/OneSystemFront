import { Check, Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n";
import { createApiKey, listApiKeys, revokeApiKey } from "../lib/api";
import { trackGlow } from "../lib/glow";
import { useFleetGroups } from "../lib/useFleetGroups";
import type { ApiKey, CreatedApiKey } from "../lib/types";

const API_URL = import.meta.env.VITE_API_URL;

function formatDate(iso: string | null, locale: string, never: string): string {
  if (!iso) return never;
  return new Date(iso).toLocaleString(locale);
}

/** Whether a key sees the whole fleet or only one área — the first thing to check before handing a key out. */
function AccessBadge({ area }: { area: string | null }) {
  const { t } = useLanguage();
  return area ? (
    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
      {t("apikeys.onlyArea", { area })}
    </span>
  ) : (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
      {t("apikeys.fullAccess")}
    </span>
  );
}

function RevealedKeyCard({ apiKey, onDismiss }: { apiKey: CreatedApiKey; onDismiss: () => void }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
      <p className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
        {t("apikeys.saveNow")}
      </p>
      <p className="mb-2 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
        {t("apikeys.scopeOfKey")} <AccessBadge area={apiKey.allowedArea} />
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 overflow-x-auto rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-amber-500/20 dark:bg-[#0d1220] dark:text-slate-200">
          {apiKey.key}
        </code>
        <button
          onClick={copy}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t("apikeys.copied") : t("apikeys.copy")}
        </button>
      </div>
      <button
        onClick={onDismiss}
        className="mt-2 text-xs text-amber-700 hover:underline dark:text-amber-400"
      >
        {t("apikeys.saved")}
      </button>
    </div>
  );
}

export function ApiKeysPage() {
  const { t, locale } = useLanguage();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  // Not the fleet context: this page also opens from OneSystec's own configuration, where there is none.
  const fleetGroups = useFleetGroups();
  const [name, setName] = useState("");
  // "" = access to the whole fleet. A user who is themselves limited to an área can only mint keys for it.
  const [area, setArea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState<CreatedApiKey | null>(null);

  function refetch() {
    setLoading(true);
    listApiKeys()
      .then(setKeys)
      .finally(() => setLoading(false));
  }

  useEffect(refetch, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await createApiKey(name, currentUser?.allowedArea ?? (area || null));
      setRevealed(created);
      setName("");
      refetch();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm(t("apikeys.confirmRevoke"))) return;
    await revokeApiKey(id);
    refetch();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("apikeys.title")}</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        {t("apikeys.intro1")} <strong>{t("apikeys.readOnly")}</strong> {t("apikeys.intro2")} <strong>{t("apikeys.fullAccessLower")}</strong>{" "}
        {t("apikeys.intro3")}{" "}
        <a
          href={`${API_URL}/v1/docs`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {t("apikeys.docs")}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </p>

      {revealed && <RevealedKeyCard apiKey={revealed} onDismiss={() => setRevealed(null)} />}

      <form
        onSubmit={handleCreate}
        onMouseMove={trackGlow}
        className="glow float-card mb-6 flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 sm:flex-row sm:items-end dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
      >
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("apikeys.name")}</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("apikeys.namePlaceholder")}
            className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
        <div className="sm:w-56">
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("apikeys.access")}</label>
          <select
            value={currentUser?.allowedArea ?? area}
            onChange={(e) => setArea(e.target.value)}
            disabled={!!currentUser?.allowedArea}
            className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="">{t("apikeys.wholeFleet")}</option>
            {fleetGroups.map((a) => (
              <option key={a} value={a}>
                {t("apikeys.onlyArea", { area: a })}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="brand-button flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {t("apikeys.create")}
        </button>
      </form>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</p>}

      {!loading && keys.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("apikeys.none")}</p>
      )}

      {!loading && keys.length > 0 && (
        <div className="float-card overflow-x-auto rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-violet-100 bg-violet-50/60 text-xs text-slate-500 uppercase dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">{t("apikeys.name")}</th>
                <th className="px-4 py-2 font-medium">{t("apikeys.access")}</th>
                <th className="px-4 py-2 font-medium">{t("apikeys.colKey")}</th>
                <th className="px-4 py-2 font-medium">{t("apikeys.colLastUsed")}</th>
                <th className="px-4 py-2 font-medium">{t("apikeys.colStatus")}</th>
                <th className="px-4 py-2 font-medium text-right">{t("apikeys.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {keys.map((key) => (
                <tr key={key.id}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{key.name}</td>
                  <td className="px-4 py-3">
                    <AccessBadge area={key.allowedArea} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {key.keyPrefix}…
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(key.lastUsedAt, locale, t("apikeys.never"))}</td>
                  <td className="px-4 py-3">
                    {key.revokedAt ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
                        {t("apikeys.revoked")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        {t("apikeys.active")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!key.revokedAt && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        aria-label={t("apikeys.revoke")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
