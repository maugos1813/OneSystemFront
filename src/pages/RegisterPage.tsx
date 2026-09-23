import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/layout/AuthLayout";
import { useAuth } from "../context/AuthContext";

export function RegisterPage() {
  const { isAuthenticated, register, loading, error } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (await register({ orgName, email, password })) navigate("/");
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Creá tu cuenta</h1>
        <p className="mb-6 text-sm text-slate-500">Empezá a monitorear tu flota en minutos</p>

        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="orgName">
          Nombre de la empresa
        </label>
        <input
          id="orgName"
          type="text"
          required
          minLength={2}
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
        <p className="-mt-3 mb-4 text-xs text-slate-400">Mínimo 8 caracteres</p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" className="font-medium text-violet-600 hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
