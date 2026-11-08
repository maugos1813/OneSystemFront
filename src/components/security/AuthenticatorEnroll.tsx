import { Check, Copy, Smartphone } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useT } from "../../i18n";
import type { TotpSetup } from "../../lib/api";
import { AuthenticatorQr } from "./AuthenticatorQr";
import { CodeInput } from "./CodeInput";

/** Adding the authenticator app: install it, scan the QR (or type the key), and confirm with the first code it shows. */
export function AuthenticatorEnroll({
  setup,
  busy,
  error,
  tone,
  onConfirm,
}: {
  setup: TotpSetup;
  busy: boolean;
  error: string | null;
  tone: "glass" | "app";
  onConfirm: (code: string) => void;
}) {
  const t = useT();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const glass = tone === "glass";

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The key is on screen: it can be typed or selected by hand.
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (code.length === 6) onConfirm(code);
  }

  const muted = glass ? "text-sky-100/90" : "text-slate-600 dark:text-slate-300";
  const keyStyle = glass ? "bg-white/10 text-white" : "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white";
  const spaced = setup.secret.replace(/(.{4})/g, "$1 ").trim();

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      <p className={muted}>{t("security.step1")}</p>
      {/* On the very phone that holds the authenticator there is no one to scan the QR: this address opens the app and adds the account. */}
      <a
        href={setup.uri}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:brightness-110 sm:hidden"
      >
        <Smartphone className="h-4 w-4" />
        {t("security.openApp")}
      </a>
      <p className={`text-xs sm:hidden ${muted}`}>{t("security.openAppHint")}</p>
      <p className={muted}>{t("security.step2")}</p>
      <div className="flex justify-center">
        <AuthenticatorQr uri={setup.uri} />
      </div>
      <p className={`text-xs ${muted}`}>{t("security.manual")}</p>
      <div className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 font-mono text-xs tracking-wider break-all ${keyStyle}`}>
        <span className="select-all">{spaced}</span>
        <button type="button" onClick={copyKey} aria-label={t("security.copy")} className="shrink-0 rounded-lg p-1.5 hover:bg-white/10">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <p className={muted}>{t("security.step3")}</p>
      <CodeInput value={code} onChange={setCode} tone={tone} autoFocus />
      {error && <p className={`rounded-lg bg-red-500/20 px-3 py-2 text-sm ${glass ? "text-red-100" : "text-red-700 dark:text-red-200"}`}>{error}</p>}
      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 px-4 py-2.5 text-base font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:brightness-110 disabled:opacity-60"
      >
        {busy ? t("security.confirming") : t("security.confirm")}
      </button>
    </form>
  );
}
