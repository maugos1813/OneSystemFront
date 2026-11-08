import { Check, KeyRound, Monitor, ShieldAlert, ShieldCheck, Smartphone, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useLanguage } from "../../i18n";
import {
  ApiError,
  disableTotp,
  enableTotp,
  getSecurity,
  listSessions,
  regenerateRecoveryCodes,
  revokeOtherSessions,
  revokeSession,
  startTotpSetup,
  type SecurityStatus,
  type SessionInfo,
  type TotpSetup,
} from "../../lib/api";
import { Panel } from "../analytics/Panel";
import { ModalPortal } from "../ModalPortal";
import { AuthenticatorEnroll } from "./AuthenticatorEnroll";
import { CodeInput } from "./CodeInput";
import { RecoveryCodes } from "./RecoveryCodes";

type Dialog =
  | { kind: "enroll"; setup: TotpSetup }
  | { kind: "codes"; codes: string[] }
  | { kind: "disable" }
  | { kind: "newCodes" };

const FIELD =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white";
const BUTTON = "rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-60";
const PRIMARY = `${BUTTON} brand-button`;
const SECONDARY = `${BUTTON} border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5`;
const DANGER = `${BUTTON} border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-500/10`;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <ModalPortal>
      <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6 dark:bg-[#111729] dark:text-white">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
            <button type="button" onClick={onClose} aria-label="×" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}

/** Password plus a code from the app: what is asked again before touching the second step itself. */
function ConfirmWithCode({
  body,
  submitLabel,
  danger,
  onSubmit,
  onCancel,
}: {
  body: string;
  submitLabel: string;
  danger?: boolean;
  onSubmit: (password: string, code: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(password, code);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("security.failed"));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">{body}</p>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {t("security.password")}
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${FIELD} mt-1`} />
      </label>
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">{t("security.appCode")}</p>
        <CodeInput value={code} onChange={setCode} tone="app" />
      </div>
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className={SECONDARY}>
          {t("security.cancel")}
        </button>
        <button type="submit" disabled={busy || !password || code.length !== 6} className={danger ? DANGER : PRIMARY}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

/**
 * Everything a person controls about how their account is protected: the authenticator app (a code besides the password,
 * obligatory for admins) and the devices that have the account open, each of which can be signed out.
 */
export function SecurityPanel() {
  const { t, locale } = useLanguage();
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextStatus, nextSessions] = await Promise.all([getSecurity(), listSessions()]);
      setStatus(nextStatus);
      setSessions(nextSessions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("security.failed"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openEnroll() {
    setError(null);
    setEnrollError(null);
    setBusy(true);
    try {
      setDialog({ kind: "enroll", setup: await startTotpSetup() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("security.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll(code: string) {
    setBusy(true);
    setEnrollError(null);
    try {
      const { recoveryCodes } = await enableTotp(code);
      setDialog({ kind: "codes", codes: recoveryCodes });
      await load();
    } catch (err) {
      setEnrollError(err instanceof ApiError ? err.message : t("security.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function signOut(id: string) {
    setMessage(null);
    try {
      await revokeSession(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("security.failed"));
    }
  }

  async function signOutOthers() {
    setMessage(null);
    try {
      const { revoked } = await revokeOtherSessions();
      setMessage(t("security.signedOutOthers", { count: revoked }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("security.failed"));
    }
  }

  const when = (iso: string) => new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  const others = sessions?.filter((session) => !session.current) ?? [];
  const lowCodes = !!status?.enabled && status.recoveryCodesLeft <= 2;

  return (
    <Panel title={t("security.title")}>
      {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-1 flex items-center gap-2">
            {status?.enabled ? <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <ShieldAlert className="h-5 w-5 text-amber-500" />}
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("security.twoStep")}</h3>
            {status && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  status.enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                }`}
              >
                {t(status.enabled ? "security.on" : "security.off")}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("security.twoStepBody")}</p>
          {status?.required && <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{t("security.requiredRole")}</p>}

          {status?.enabled && (
            <p className={`mt-3 flex items-center gap-1.5 text-sm ${lowCodes ? "font-medium text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}>
              <KeyRound className="h-4 w-4" />
              {t("security.recoveryLeft", { count: status.recoveryCodesLeft })}
              {lowCodes && ` · ${t("security.recoveryLow")}`}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {status && !status.enabled && (
              <button type="button" disabled={busy} onClick={() => void openEnroll()} className={PRIMARY}>
                {t("security.enable")}
              </button>
            )}
            {status?.enabled && (
              <button type="button" onClick={() => setDialog({ kind: "newCodes" })} className={SECONDARY}>
                {t("security.newCodes")}
              </button>
            )}
            {status?.enabled && !status.required && (
              <button type="button" onClick={() => setDialog({ kind: "disable" })} className={DANGER}>
                {t("security.disable")}
              </button>
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">{t("security.sessionsTitle")}</h3>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{t("security.sessionsBody")}</p>
          {sessions === null ? (
            <p className="text-sm text-slate-400">…</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {sessions.map((session) => {
                const Icon = session.client === "app" ? Smartphone : Monitor;
                return (
                  <li key={session.id} className="flex items-center gap-3 py-2.5">
                    <Icon className="h-5 w-5 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {session.device || "—"}
                        {session.current && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                            <Check className="h-3 w-3" />
                            {t("security.thisDevice")}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {t("security.lastUsed", { when: when(session.lastUsedAt) })}
                        {session.ip ? ` · ${session.ip}` : ""}
                      </p>
                    </div>
                    {!session.current && (
                      <button type="button" onClick={() => void signOut(session.id)} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10">
                        {t("security.signOut")}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {sessions !== null && others.length > 0 && (
            <button type="button" onClick={() => void signOutOthers()} className={`${DANGER} mt-3`}>
              {t("security.signOutOthers")}
            </button>
          )}
          {sessions !== null && others.length === 0 && <p className="mt-2 text-xs text-slate-400">{t("security.noOthers")}</p>}
          {message && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
        </section>
      </div>

      {dialog?.kind === "enroll" && (
        <Modal title={t("security.twoStep")} onClose={() => setDialog(null)}>
          <AuthenticatorEnroll setup={dialog.setup} busy={busy} error={enrollError} tone="app" onConfirm={(code) => void confirmEnroll(code)} />
        </Modal>
      )}
      {dialog?.kind === "codes" && (
        <Modal title={t("security.codesTitle")} onClose={() => setDialog(null)}>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t("security.codesBody")}</p>
          <RecoveryCodes codes={dialog.codes} tone="app" />
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => setDialog(null)} className={PRIMARY}>
              {t("security.done")}
            </button>
          </div>
        </Modal>
      )}
      {dialog?.kind === "disable" && (
        <Modal title={t("security.disableTitle")} onClose={() => setDialog(null)}>
          <ConfirmWithCode
            body={t("security.disableBody")}
            submitLabel={t("security.disable")}
            danger
            onCancel={() => setDialog(null)}
            onSubmit={async (password, code) => {
              await disableTotp(password, { code });
              setDialog(null);
              await load();
            }}
          />
        </Modal>
      )}
      {dialog?.kind === "newCodes" && (
        <Modal title={t("security.newCodesTitle")} onClose={() => setDialog(null)}>
          <ConfirmWithCode
            body={t("security.newCodesBody")}
            submitLabel={t("security.newCodes")}
            onCancel={() => setDialog(null)}
            onSubmit={async (password, code) => {
              const { recoveryCodes } = await regenerateRecoveryCodes(password, code);
              setDialog({ kind: "codes", codes: recoveryCodes });
              await load();
            }}
          />
        </Modal>
      )}
    </Panel>
  );
}
