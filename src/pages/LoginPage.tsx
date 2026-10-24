import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/layout/AuthLayout";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";
import { trackGlow } from "../lib/glow";

export function LoginPage() {
  const t = useT();
  const { isAuthenticated, login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (await login(email, password)) navigate("/");
  }

  return (
    <AuthLayout>
      <form
        onSubmit={handleSubmit}
        onMouseMove={trackGlow}
        className="glow w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8 dark:border dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
      >
        <h1 className="mb-1 text-xl font-semibold text-slate-900 dark:text-white">{t("login.title")}</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{t("login.subtitle")}</p>

        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
          {t("login.email")}
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field-input mb-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
          {t("login.password")}
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field-input mb-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        />

        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="brand-button w-full rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? t("login.submitting") : t("login.submit")}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          {t("login.newCompany")}{" "}
          <Link to="/register" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            {t("login.createAccount")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
