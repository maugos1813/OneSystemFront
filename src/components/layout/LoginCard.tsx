import { ArrowLeft, ArrowRight, Eye, EyeOff, Headset, KeyRound, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useT } from "../../i18n";
import type { TotpSetup } from "../../lib/api";
import { AuthenticatorEnroll } from "../security/AuthenticatorEnroll";
import { CodeInput } from "../security/CodeInput";
import { RecoveryCodes } from "../security/RecoveryCodes";

/** Where "contact support" writes to: the platform's own mailbox. */
export const SUPPORT_EMAIL = "onesystecsrl@gmail.com";

/** Where the sign-in is: the password, the code of the authenticator app, or (admins, the first time) setting that app up. */
type Step =
  | { kind: "credentials" }
  | { kind: "code"; mfaToken: string; recovery: boolean }
  | { kind: "setup"; mfaToken: string; setup: TotpSetup }
  | { kind: "saveCodes"; recoveryCodes: string[]; finish: () => void };

const INPUT_CLASS =
  "w-full rounded-xl border border-transparent bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/30 focus:outline-none sm:py-3";
const PRIMARY_BUTTON =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 px-4 py-2 text-base font-semibold sm:py-3 text-white shadow-lg shadow-blue-900/40 transition hover:brightness-110 disabled:opacity-60";
const CARD_CLASS = "rounded-3xl border border-sky-300/30 bg-[#0a2260]/55 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur-md sm:p-8";

/** The sign-in both apps share: a glass card meant to float over a dark picture. It goes on by itself to the second step when the account needs it. */
export function LoginCard() {
  const t = useT();
  const { login, submitSecondStep, beginAuthenticatorSetup, confirmAuthenticatorSetup, loading, error, clearError } = useAuth();
  const [step, setStep] = useState<Step>({ kind: "credentials" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [saved, setSaved] = useState(false);

  function backToStart() {
    clearError();
    setCode("");
    setRecoveryCode("");
    setPassword("");
    setStep({ kind: "credentials" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const outcome = await login(email, password);
    if (outcome.kind === "code") {
      setStep({ kind: "code", mfaToken: outcome.mfaToken, recovery: false });
    } else if (outcome.kind === "setup") {
      const setup = await beginAuthenticatorSetup(outcome.mfaToken);
      if (setup) setStep({ kind: "setup", mfaToken: outcome.mfaToken, setup });
    }
    // "done": the session started and the page moves on by itself.
  }

  async function sendCode(mfaToken: string, recovery: boolean, typed?: string) {
    const result = await submitSecondStep(mfaToken, recovery ? { recoveryCode } : { code: typed ?? code });
    if (!result.ok) setCode("");
  }

  const title = (icon: React.ReactNode, text: string, hint: string) => (
    <>
      <div className="mb-1 flex items-center gap-4">
        {icon}
        <h1 className="text-xl font-semibold sm:text-2xl">{text}</h1>
      </div>
      <p className="mb-3 text-xs text-sky-100/90 sm:mb-6 sm:text-sm">{hint}</p>
    </>
  );
  const errorBox = error && <p className="mb-4 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-100">{error}</p>;
  const backButton = (
    <button type="button" onClick={backToStart} className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-sky-100/90 hover:text-white">
      <ArrowLeft className="h-4 w-4" /> {t("login.back")}
    </button>
  );

  if (step.kind === "code") {
    const { mfaToken, recovery } = step;
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendCode(mfaToken, recovery);
        }}
        className={CARD_CLASS}
      >
        {title(<ShieldCheck className="h-8 w-8 shrink-0 sm:h-10 sm:w-10" strokeWidth={1.5} />, t("login.codeHeading"), t(recovery ? "login.recoveryHint" : "login.codeHint"))}
        <label className="mb-1.5 flex items-center gap-2 text-sm font-medium" htmlFor="code">
          <KeyRound className="h-5 w-5" /> {t(recovery ? "login.recoveryLabel" : "login.codeLabel")}
        </label>
        <div className="mb-4">
          {recovery ? (
            <input
              id="code"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="XXXXX-XXXXX"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              className={`${INPUT_CLASS} text-center font-mono tracking-widest`}
            />
          ) : (
            <CodeInput id="code" value={code} onChange={setCode} tone="glass" autoFocus onComplete={(typed) => void sendCode(mfaToken, false, typed)} />
          )}
        </div>
        {errorBox}
        <button type="submit" disabled={loading || (recovery ? recoveryCode.trim().length < 8 : code.length !== 6)} className={PRIMARY_BUTTON}>
          {loading ? t("login.verifying") : t("login.verify")}
          {!loading && <ArrowRight className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => {
            clearError();
            setCode("");
            setRecoveryCode("");
            setStep({ kind: "code", mfaToken, recovery: !recovery });
          }}
          className="mt-4 w-full text-center text-sm text-sky-100/90 underline-offset-2 hover:text-white hover:underline"
        >
          {t(recovery ? "login.useApp" : "login.useRecovery")}
        </button>
        {backButton}
      </form>
    );
  }

  if (step.kind === "setup") {
    const { mfaToken, setup } = step;
    return (
      <div className={CARD_CLASS}>
        {title(<ShieldCheck className="h-8 w-8 shrink-0 sm:h-10 sm:w-10" strokeWidth={1.5} />, t("login.setupHeading"), t("login.setupHint"))}
        <AuthenticatorEnroll
          setup={setup}
          busy={loading}
          error={error}
          tone="glass"
          onConfirm={async (typed) => {
            const done = await confirmAuthenticatorSetup(mfaToken, typed);
            if (done) setStep({ kind: "saveCodes", recoveryCodes: done.recoveryCodes, finish: done.finish });
          }}
        />
        {backButton}
      </div>
    );
  }

  if (step.kind === "saveCodes") {
    return (
      <div className={CARD_CLASS}>
        {title(<KeyRound className="h-8 w-8 shrink-0 sm:h-10 sm:w-10" strokeWidth={1.5} />, t("login.codesHeading"), t("security.codesBody"))}
        <RecoveryCodes codes={step.recoveryCodes} tone="glass" />
        <label className="mt-4 mb-4 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-sky-400" />
          {t("login.codesSaved")}
        </label>
        <button type="button" disabled={!saved} onClick={step.finish} className={PRIMARY_BUTTON}>
          {t("login.codesContinue")} <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    );
  }

  const input = INPUT_CLASS;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={CARD_CLASS}>
      <div className="mb-1 flex items-center gap-4">
        <UserRound className="h-8 w-8 shrink-0 sm:h-10 sm:w-10" strokeWidth={1.5} />
        <h1 className="text-xl font-semibold sm:text-2xl">{t("login.heading")}</h1>
      </div>
      <p className="mb-3 text-xs text-sky-100/90 sm:mb-7 sm:text-sm">{t("login.hint")}</p>

      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium" htmlFor="email">
        <Mail className="h-5 w-5" /> {t("login.email")}
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`${input} mb-3 sm:mb-5`}
      />

      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium" htmlFor="password">
        <Lock className="h-5 w-5" /> {t("login.password")}
      </label>
      <div className="relative mb-3 sm:mb-5">
        <input
          id="password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="current-password"
          placeholder={t("login.placeholderPassword")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${input} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={t(showPassword ? "login.hidePassword" : "login.showPassword")}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-600 hover:text-slate-900"
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-100">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 px-4 py-2 text-base font-semibold sm:py-3 text-white shadow-lg shadow-blue-900/40 transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? t("login.submitting") : t("login.submit")}
        {!loading && <ArrowRight className="h-5 w-5" />}
      </button>

      <div className="my-3 flex sm:my-5 flex items-center gap-4 text-sm text-sky-100/90">
        <span className="h-px flex-1 bg-white/30" />
        {t("login.or")}
        <span className="h-px flex-1 bg-white/30" />
      </div>

      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/60 px-4 py-2 text-sm font-medium transition hover:bg-white/10 sm:py-3"
      >
        <Headset className="h-5 w-5" /> {t("login.support")}
      </a>
    </form>
  );
}
