import { Check, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useT, type MessageKey } from "../../i18n";
import type { TotpSetup } from "../../lib/api";
import { isNativeApp } from "../../lib/appFlavor";
import { AuthenticatorQr } from "./AuthenticatorQr";
import { CodeInput } from "./CodeInput";

/** Apps that make the 6-digit codes. Any one works (so does Samsung Pass or a password manager); these are only the common ones to install. */
const APPS: Array<{ name: MessageKey; desc: MessageKey; android: string; ios: string }> = [
  {
    name: "security.appGoogle",
    desc: "security.appGoogleDesc",
    android: "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2",
    ios: "https://apps.apple.com/app/id388497605",
  },
  {
    name: "security.appMicrosoft",
    desc: "security.appMicrosoftDesc",
    android: "https://play.google.com/store/apps/details?id=com.azure.authenticator",
    ios: "https://apps.apple.com/app/id983156458",
  },
  {
    name: "security.appAuthy",
    desc: "security.appAuthyDesc",
    android: "https://play.google.com/store/apps/details?id=com.authy.authy",
    ios: "https://apps.apple.com/app/id494168017",
  },
  {
    name: "security.appOnePassword",
    desc: "security.appOnePasswordDesc",
    android: "https://play.google.com/store/apps/details?id=com.onepassword.android",
    ios: "https://apps.apple.com/app/id1511601750",
  },
];

/** Which store this device uses, or null on a computer (where each app shows both). */
function deviceStore(): "android" | "ios" | null {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return isNativeApp() ? "android" : null;
}

/**
 * Adding the authenticator app. The person picks the app they like (there is a short list to install one, and any other works):
 * on a phone the key is copied and pasted into it, because nobody can scan a QR shown on the very screen they hold; on a computer
 * the QR is scanned with the phone. Then the first code it shows confirms it.
 */
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
  const store = deviceStore();
  const onPhone = store !== null;

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // The key is on screen: it can be selected and copied by hand.
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (code.length === 6) onConfirm(code);
  }

  const muted = glass ? "text-sky-100/90" : "text-slate-600 dark:text-slate-300";
  const faint = glass ? "text-sky-100/70" : "text-slate-500 dark:text-slate-400";
  const box = glass ? "bg-white/10 text-white" : "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white";
  const outline = glass ? "border-white/30 hover:bg-white/10" : "border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5";
  const spaced = setup.secret.replace(/(.{4})/g, "$1 ").trim();

  const storeLink = (href: string, label: string) => (
    <a
      key={label}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${outline}`}
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      <p className={muted}>{t("security.step1")}</p>
      <ul className="space-y-1.5">
        {APPS.map((app) => (
          <li key={app.name} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${box}`}>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t(app.name)}</span>
              <span className={`block text-xs ${faint}`}>{t(app.desc)}</span>
            </span>
            <span className="flex shrink-0 gap-1.5">
              {(store === null || store === "android") && storeLink(app.android, store === null ? "Android" : t("security.install"))}
              {(store === null || store === "ios") && storeLink(app.ios, store === null ? "iPhone" : t("security.install"))}
            </span>
          </li>
        ))}
      </ul>
      <p className={`text-xs ${faint}`}>{t("security.haveApp")}</p>

      {onPhone ? (
        <>
          <p className={muted}>{t("security.step2Phone")}</p>
          <button
            type="button"
            onClick={copyKey}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${outline} ${glass ? "text-white" : "text-slate-800 dark:text-white"}`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {t(copied ? "security.keyCopied" : "security.copyKey")}
          </button>
          <p className={`rounded-xl px-3 py-2 font-mono text-xs tracking-wider break-all select-all ${box}`}>{spaced}</p>
          <p className={`text-xs ${faint}`}>{t("security.phoneHowTo")}</p>
          <a href={setup.uri} className={`flex items-center gap-1 text-xs underline underline-offset-2 ${faint}`}>
            <ChevronRight className="h-3 w-3" />
            {t("security.openDirect")}
          </a>
          <p className={`-mt-2 pl-4 text-[11px] ${faint}`}>{t("security.openDirectNote")}</p>
          <details className="group">
            <summary className={`flex cursor-pointer list-none items-center gap-1 text-xs ${faint}`}>
              <ChevronRight className="h-3 w-3 transition group-open:rotate-90" />
              {t("security.otherDevice")}
            </summary>
            <div className="mt-2 flex justify-center">
              <AuthenticatorQr uri={setup.uri} />
            </div>
          </details>
        </>
      ) : (
        <>
          <p className={muted}>{t("security.step2")}</p>
          <div className="flex justify-center">
            <AuthenticatorQr uri={setup.uri} />
          </div>
          <p className={`text-xs ${faint}`}>{t("security.manual")}</p>
          <div className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 font-mono text-xs tracking-wider break-all ${box}`}>
            <span className="select-all">{spaced}</span>
            <button type="button" onClick={copyKey} aria-label={t("security.copy")} className="shrink-0 rounded-lg p-1.5 hover:bg-white/10">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </>
      )}

      <p className={muted}>{t("security.step3")}</p>
      <CodeInput value={code} onChange={setCode} tone={tone} autoFocus={!onPhone} />
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
