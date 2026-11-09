import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useT } from "../../i18n";
import { qrPoll, qrStart } from "../../lib/api";
import { AuthenticatorQr } from "./AuthenticatorQr";

const POLL_MS = 2000;
/** A fresh QR replaces the one on screen this long before it stops working. */
const REFRESH_AHEAD_S = 15;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * "Entrar con el celular": the QR a phone scans to open this computer (the WhatsApp Web way). It asks the server for a code, shows
 * it, and polls until a phone authorizes; the QR is renewed by itself before it expires.
 */
export function QrLoginPanel() {
  const t = useT();
  const { signInWithTokens } = useAuth();
  const [state, setState] = useState<{ kind: "loading" } | { kind: "waiting"; uri: string } | { kind: "denied" } | { kind: "error" }>({ kind: "loading" });
  const [round, setRound] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      let started;
      try {
        started = await qrStart();
      } catch {
        if (!cancelled) setState({ kind: "error" });
        return;
      }
      if (cancelled) return;
      // The QR carries a link to the site, so a phone's camera app that reads it lands on a page saying to use the app.
      setState({ kind: "waiting", uri: `${window.location.origin}/vincular?c=${started.code}` });

      const until = Date.now() + (started.expiresInSec - REFRESH_AHEAD_S) * 1000;
      while (!cancelled && Date.now() < until) {
        await sleep(POLL_MS);
        if (cancelled) return;
        let answer;
        try {
          answer = await qrPoll(started.code);
        } catch {
          continue; // a hiccup: the next poll tries again
        }
        if (answer.status === "approved") {
          signInWithTokens(answer);
          return;
        }
        if (answer.status === "denied") {
          setState({ kind: "denied" });
          return;
        }
        if (answer.status === "expired") break;
      }
      if (!cancelled) setRound((n) => n + 1);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [round, signInWithTokens]);

  const again = (
    <button type="button" onClick={() => setRound((n) => n + 1)} className="w-full rounded-xl border border-white/40 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">
      {t("login.qrNew")}
    </button>
  );

  if (state.kind === "error") {
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-100">{t("login.qrError")}</p>
        {again}
      </div>
    );
  }
  if (state.kind === "denied") {
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-100">{t("login.qrDenied")}</p>
        {again}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm text-sky-100/90">
      <p>{t("login.qrStep1")}</p>
      <p>{t("login.qrStep2")}</p>
      <p>{t("login.qrStep3")}</p>
      <div className="flex min-h-[11rem] justify-center py-1">
        {state.kind === "waiting" ? <AuthenticatorQr uri={state.uri} size={176} label={t("login.qrHeading")} /> : <p className="self-center text-sky-100/70">…</p>}
      </div>
      <p className="text-center text-xs text-sky-100/70">{t("login.qrWaiting")}</p>
      <p className="text-center text-xs text-sky-100/60">{t("login.qrNeedApp")}</p>
    </div>
  );
}
