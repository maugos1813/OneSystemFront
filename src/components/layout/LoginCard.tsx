import { ArrowRight, Eye, EyeOff, Headset, Lock, Mail, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useT } from "../../i18n";

/** Where "contact support" writes to: the platform's own mailbox. */
const SUPPORT_EMAIL = "onesystecsrl@gmail.com";

/** The sign-in form both apps share: a glass card meant to float over a dark picture. */
export function LoginCard({ onSubmit }: { onSubmit: (email: string, password: string) => Promise<void> }) {
  const t = useT();
  const { loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void onSubmit(email, password);
  }

  const input =
    "w-full rounded-xl border border-transparent bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/30 focus:outline-none sm:py-3";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-sky-300/30 bg-[#0a2260]/55 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur-md sm:p-8"
    >
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
