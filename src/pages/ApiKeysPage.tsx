import { Check, Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { createApiKey, listApiKeys, revokeApiKey } from "../lib/api";
import { trackGlow } from "../lib/glow";
import type { ApiKey, CreatedApiKey } from "../lib/types";

const API_URL = import.meta.env.VITE_API_URL;

function formatDate(iso: string | null): string {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString();
}

function RevealedKeyCard({ apiKey, onDismiss }: { apiKey: CreatedApiKey; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="mb-2 text-sm font-semibold text-amber-800">
        Guardá esta clave ahora — no la vamos a mostrar de nuevo.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 overflow-x-auto rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800">
          {apiKey.key}
        </code>
        <button
          onClick={copy}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiada" : "Copiar"}
        </button>
      </div>
      <button onClick={onDismiss} className="mt-2 text-xs text-amber-700 hover:underline">
        Ya la guardé, ocultar
      </button>
    </div>
  );
}

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState<CreatedApiKey | null>(null);

  function refetch() {
    setLoading(true);
    listApiKeys()
      .then(setKeys)
      .finally(() => setLoading(false));
  }

  useEffect(refetch, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await createApiKey(name);
      setRevealed(created);
      setName("");
      refetch();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("¿Revocar esta API key? Cualquier integración que la use va a dejar de funcionar.")) return;
    await revokeApiKey(id);
    refetch();
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900">API Keys</h1>
      <p className="mb-6 text-sm text-slate-500">
        Credenciales para que integres los datos de tu flota en otras apps.{" "}
        <a
          href={`${API_URL}/docs`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
        >
          Ver documentación de la API
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </p>

      {revealed && <RevealedKeyCard apiKey={revealed} onDismiss={() => setRevealed(null)} />}

      <form
        onSubmit={handleCreate}
        onMouseMove={trackGlow}
        className="glow float-card mb-6 flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Integración con mi ERP"
            className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="brand-button flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Crear key
        </button>
      </form>

      {loading && <p className="text-sm text-slate-500">Cargando...</p>}

      {!loading && keys.length === 0 && (
        <p className="text-sm text-slate-500">Todavía no creaste ninguna API key.</p>
      )}

      {!loading && keys.length > 0 && (
        <div className="float-card overflow-x-auto rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-violet-100 bg-violet-50/60 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Clave</th>
                <th className="px-4 py-2 font-medium">Última vez usada</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keys.map((key) => (
                <tr key={key.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{key.keyPrefix}…</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(key.lastUsedAt)}</td>
                  <td className="px-4 py-3">
                    {key.revokedAt ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Revocada
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Activa
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!key.revokedAt && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Revocar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
