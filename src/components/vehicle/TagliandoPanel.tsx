import { Wrench } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { deleteMaintenancePlan, getTagliando, listMaintenance, saveTagliando } from "../../lib/api";
import { trackGlow } from "../../lib/glow";
import { formatKm, STATE_BADGE, STATE_BAR, STATE_LABEL } from "../../lib/maintenance";
import type { MaintenancePlan, Tagliando } from "../../lib/types";

const CARD =
  "glow float-card rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 sm:p-5 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40";
const INPUT =
  "field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white";
const LABEL = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const formatDay = (value: string) => new Date(value).toLocaleDateString("es-AR");

/** "85.000" or "85000" → 85000; null for anything that is not a whole number of km. */
function parseKm(value: string): number | null {
  const trimmed = value.trim().replace(/\./g, "");
  return /^\d{1,7}$/.test(trimmed) ? Number(trimmed) : null;
}

/**
 * The tagliando of one vehicle: every 20 000 km. What is left is the km of the last tagliando plus 20 000, minus the
 * vehicle's km now. Only the km of a tagliando that was done are typed here; the km now keep themselves (see Perfil).
 */
export function TagliandoPanel({ vehicleId }: { vehicleId: string }) {
  const { currentUser } = useAuth();
  const canManage = currentUser?.role === "owner" || currentUser?.role === "admin" || currentUser?.role === "manager";
  const [data, setData] = useState<Tagliando | null>(null);
  const [others, setOthers] = useState<MaintenancePlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [km, setKm] = useState("");
  const [doneAt, setDoneAt] = useState(todayLocal());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    getTagliando(vehicleId)
      .then((view) => {
        setData(view);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo cargar el tagliando"));
    // Plans made before there was a Tagliando section stay visible, so nothing is silently hidden.
    listMaintenance(vehicleId)
      .then((rows) => setOthers((rows[0]?.plans ?? []).filter((plan) => plan.name.trim().toLowerCase() !== "tagliando")))
      .catch(() => undefined);
  }, [vehicleId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(mode: "new" | "fix", e?: FormEvent) {
    e?.preventDefault();
    const typed = parseKm(km);
    if (typed === null) return setMessage({ ok: false, text: "Indica los km del tablero cuando se hizo el tagliando." });
    setSaving(true);
    setMessage(null);
    try {
      // Today is left out so the server stamps the real moment; a past day goes as local noon.
      const day = doneAt && doneAt !== todayLocal() ? new Date(`${doneAt}T12:00:00`).toISOString() : undefined;
      setData(await saveTagliando(vehicleId, { km: typed, mode, ...(day ? { doneAt: day } : {}) }));
      setKm("");
      setMessage({ ok: true, text: mode === "fix" ? "Tagliando corregido." : "Tagliando guardado." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "No se pudo guardar" });
    } finally {
      setSaving(false);
    }
  }

  async function removeOther(plan: MaintenancePlan) {
    if (!window.confirm(`¿Eliminar el plan "${plan.name}" y todo su historial?`)) return;
    await deleteMaintenancePlan(plan.id);
    load();
  }

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>;

  const { status } = data;
  const percent = Math.min(100, Math.round((status.usedFraction ?? 0) * 100));
  const remaining = data.kmRemaining;

  return (
    <div className="space-y-4">
      <section onMouseMove={trackGlow} className={CARD}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Wrench className="h-4 w-4 text-slate-400" />
            Tagliando cada {formatKm(data.intervalKm)}
          </h2>
          {data.lastKm !== null && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_BADGE[status.state]}`}>{STATE_LABEL[status.state]}</span>}
        </div>

        {data.lastKm === null ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no hay un tagliando anotado. Anota abajo los km del último que se hizo y se empieza a contar.</p>
        ) : remaining === null ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            No se conocen los km actuales del vehículo. Anótalos en la pestaña Perfil y aquí se calcula cuánto falta.
          </p>
        ) : (
          <>
            <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {remaining >= 0 ? `Faltan ${formatKm(remaining)}` : `Pasado por ${formatKm(-remaining)}`}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <div className={`h-full rounded-full ${STATE_BAR[status.state]}`} style={{ width: `${percent}%` }} />
            </div>
          </>
        )}

        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-sm dark:border-white/10">
          <div>
            <dt className="text-xs text-slate-400 dark:text-slate-500">Último tagliando</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{data.lastKm !== null ? formatKm(data.lastKm) : "—"}</dd>
            {data.lastAt && <dd className="text-xs text-slate-400 dark:text-slate-500">{formatDay(data.lastAt)}</dd>}
          </div>
          <div>
            <dt className="text-xs text-slate-400 dark:text-slate-500">Próximo a los</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{data.dueKm !== null ? formatKm(data.dueKm) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 dark:text-slate-500">Km actuales</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{data.currentKm !== null ? formatKm(data.currentKm) : "—"}</dd>
            <dd className="text-xs text-slate-400 dark:text-slate-500">se actualizan solos</dd>
          </div>
        </dl>
      </section>

      {canManage && (
        <form onSubmit={(e) => void save("new", e)} onMouseMove={trackGlow} className={CARD}>
          <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
            {data.lastKm === null ? "Anotar el último tagliando" : "Se hizo un tagliando"}
          </h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Solo hay que anotar los km del tablero cuando se hizo. Los km actuales del vehículo no hace falta tocarlos: se cuentan solos.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="tg-km">Km del tablero en el tagliando</label>
              <input id="tg-km" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} placeholder={data.lastKm?.toString() ?? "60000"} className={INPUT} />
            </div>
            <div>
              <label className={LABEL} htmlFor="tg-date">Fecha</label>
              <input id="tg-date" type="date" max={todayLocal()} value={doneAt} onChange={(e) => setDoneAt(e.target.value)} className={INPUT} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            {message && <p className={`mr-auto text-sm ${message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{message.text}</p>}
            {data.lastKm !== null && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void save("fix")}
                className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Corregir el último
              </button>
            )}
            <button type="submit" disabled={saving} className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
              {data.lastKm === null ? "Guardar" : "Registrar tagliando hecho"}
            </button>
          </div>
        </form>
      )}

      {data.history.length > 0 && (
        <section onMouseMove={trackGlow} className={CARD}>
          <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Tagliandos hechos</h2>
          <ul className="divide-y divide-slate-100 text-sm dark:divide-white/10">
            {data.history.map((record) => (
              <li key={record.id} className="flex justify-between py-1.5 text-slate-700 dark:text-slate-300">
                <span>{formatDay(record.doneAt)}</span>
                <span className="font-medium">{record.km !== null ? formatKm(record.km) : "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <section className={CARD}>
          <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">Otros planes de antes</h2>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Siguen avisando como siempre; elimínalos si ya no los usas.</p>
          <ul className="divide-y divide-slate-100 text-sm dark:divide-white/10">
            {others.map((plan) => (
              <li key={plan.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">
                  {plan.name} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATE_BADGE[plan.status.state]}`}>{STATE_LABEL[plan.status.state]}</span>
                </span>
                {canManage && (
                  <button type="button" onClick={() => void removeOther(plan)} className="shrink-0 text-xs text-slate-400 hover:text-red-600">
                    Eliminar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
