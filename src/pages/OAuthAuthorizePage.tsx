import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";
import { decideAuthorization, validateAuthorizeRequest, type AuthorizeParams, type AuthorizeValidation } from "../lib/api";
import { clearReturnTo, rememberReturnTo } from "../lib/afterLogin";

const FIELDS = ["response_type", "client_id", "redirect_uri", "scope", "state", "code_challenge", "code_challenge_method"] as const;

/**
 * "Sign in with OneTrack": another app (App Piazza) asks to read the person's vehicles. The person signs in here (with their usual
 * password and code), sees who asks and what for, and approves or declines. The other app never sees the password.
 */
export function OAuthAuthorizePage() {
  const t = useT();
  const { search, pathname } = useLocation();
  const { isAuthenticated, currentUser, logout } = useAuth();
  const [check, setCheck] = useState<AuthorizeValidation | "loading" | "failed">("loading");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = new URLSearchParams(search);
  const params = Object.fromEntries(FIELDS.map((field) => [field, query.get(field)])) as unknown as AuthorizeParams;

  useEffect(() => {
    let alive = true;
    validateAuthorizeRequest(params)
      .then((answer) => {
        if (!alive) return;
        // A request that is wrong but whose app and address are known goes back to the app as an OAuth error.
        if (!answer.valid && answer.redirectTo) window.location.replace(answer.redirectTo);
        else setCheck(answer);
      })
      .catch(() => alive && setCheck("failed"));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Once back here and signed in, the "come back here" memory has done its job.
  useEffect(() => {
    if (isAuthenticated) clearReturnTo();
  }, [isAuthenticated]);

  // Not signed in yet: the usual sign-in, which brings the person back here.
  if (check !== "loading" && check !== "failed" && check.valid && !isAuthenticated) {
    rememberReturnTo(pathname + search);
    return <Navigate to="/login" replace />;
  }

  async function decide(decision: "approve" | "deny") {
    setSending(true);
    setError(null);
    try {
      const { redirectTo } = await decideAuthorization(params, decision);
      clearReturnTo();
      window.location.assign(redirectTo);
    } catch {
      setError(t("oauth.failed"));
      setSending(false);
    }
  }

  const shell = (children: React.ReactNode) => (
    <main className="flex min-h-dvh items-center justify-center bg-[#071a4a] px-6 py-10 text-white">
      <div className="w-full max-w-md rounded-3xl border border-sky-300/30 bg-[#0a2260]/55 p-6 shadow-2xl shadow-black/40">{children}</div>
    </main>
  );

  if (check === "loading") return shell(<p className="text-center text-sm text-sky-100/90">{t("oauth.checking")}</p>);
  if (check === "failed" || !check.valid) {
    return shell(
      <div className="text-center">
        <h1 className="mb-2 text-xl font-semibold">{t("oauth.invalidTitle")}</h1>
        <p className="text-sm text-sky-100/90">{t("oauth.invalidBody")}</p>
      </div>,
    );
  }
  if (!currentUser) return shell(<p className="text-center text-sm text-sky-100/90">{t("oauth.checking")}</p>);
  // Only a person's own session authorizes: not OneSystec looking at or managing a client's account.
  if (currentUser.viewingAs) {
    return shell(
      <div className="text-center">
        <h1 className="mb-2 text-xl font-semibold">{t("oauth.viewingTitle")}</h1>
        <p className="text-sm text-sky-100/90">{t("oauth.viewingBody")}</p>
      </div>,
    );
  }

  return shell(
    <>
      <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-sky-300" strokeWidth={1.5} />
      <h1 className="mb-2 text-center text-xl font-semibold">{t("oauth.wants", { app: check.clientName })}</h1>
      <p className="mb-4 text-center text-sm text-sky-100/90">{t("oauth.detail", { app: check.clientName })}</p>
      <p className="mb-5 rounded-xl bg-white/10 px-3 py-2 text-center text-xs text-sky-100/90">
        {t("oauth.account", { name: currentUser.orgName, email: currentUser.email })}{" "}
        <button type="button" onClick={logout} className="underline">
          {t("oauth.notYou")}
        </button>
      </p>
      {error && <p className="mb-3 text-center text-sm text-red-300">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={sending}
          onClick={() => void decide("deny")}
          className="flex-1 rounded-xl border border-sky-300/40 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
        >
          {t("oauth.cancel")}
        </button>
        <button
          type="button"
          disabled={sending}
          onClick={() => void decide("approve")}
          className="flex-1 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {sending ? t("oauth.sending") : t("oauth.authorize")}
        </button>
      </div>
    </>,
  );
}
