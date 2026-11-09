import { QrCode, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useT } from "../../i18n";
import { ApiError, qrApprove, qrDeny, qrInspect, type QrRequestInfo } from "../../lib/api";
import { qrLoginCodeFrom, ScanError, scanQrText } from "../../lib/qrScan";
import { SecurityModal } from "./SecurityModal";

/**
 * In the phone apps: scan the QR the web's login shows and authorize that computer to enter with this account, like WhatsApp Web.
 * Before anything is authorized the phone says which computer is asking and from where.
 */
export function LinkWebCard() {
  const t = useT();
  const [busy, setBusy] = useState<"idle" | "scanning" | "installing" | "authorizing">("idle");
  const [pending, setPending] = useState<{ code: string; info: QrRequestInfo } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function scan() {
    setMessage(null);
    setBusy("scanning");
    try {
      const text = await scanQrText(() => setBusy("installing"));
      const code = qrLoginCodeFrom(text);
      if (!code) {
        setMessage({ ok: false, text: t("link.notOurs") });
        return;
      }
      try {
        setPending({ code, info: await qrInspect(code) });
      } catch (err) {
        setMessage({ ok: false, text: err instanceof ApiError ? err.message : t("link.failed") });
      }
    } catch (err) {
      if (err instanceof ScanError && err.reason === "unsupported") setMessage({ ok: false, text: t("link.unsupported") });
      // "cancelled": the person closed the camera; nothing to say.
    } finally {
      setBusy("idle");
    }
  }

  async function authorize() {
    if (!pending) return;
    setBusy("authorizing");
    try {
      await qrApprove(pending.code);
      setPending(null);
      setMessage({ ok: true, text: t("link.done") });
    } catch (err) {
      setPending(null);
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : t("link.failed") });
    } finally {
      setBusy("idle");
    }
  }

  async function reject() {
    const code = pending?.code;
    setPending(null);
    if (code) await qrDeny(code).catch(() => undefined);
  }

  return (
    <section className="mb-6 border-b border-slate-100 pb-6 dark:border-white/5">
      <div className="mb-1 flex items-center gap-2">
        <QrCode className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("link.title")}</h3>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{t("link.body")}</p>
      <button
        type="button"
        disabled={busy !== "idle"}
        onClick={() => void scan()}
        className="brand-button mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        <QrCode className="h-4 w-4" />
        {busy === "installing" ? t("link.installing") : t("link.scan")}
      </button>
      {message && <p className={`mt-3 text-sm ${message.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{message.text}</p>}

      {pending && (
        <SecurityModal title={t("link.confirmTitle")} onClose={() => void reject()}>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t("link.confirmBody")}</p>
          <dl className="mb-4 space-y-2 rounded-xl bg-slate-100 p-3 text-sm dark:bg-white/10">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">{t("link.device")}</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{pending.info.device || "—"}</dd>
            </div>
            {pending.info.ip && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">{t("link.address")}</dt>
                <dd className="font-mono text-slate-900 dark:text-white">{pending.info.ip}</dd>
              </div>
            )}
          </dl>
          <p className="mb-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {t("link.warn")}
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => void reject()} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
              {t("link.reject")}
            </button>
            <button type="button" disabled={busy === "authorizing"} onClick={() => void authorize()} className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60">
              {t("link.authorize")}
            </button>
          </div>
        </SecurityModal>
      )}
    </section>
  );
}
