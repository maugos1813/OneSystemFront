import { FileCheck, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ApiError,
  createVehicleDocument,
  deleteVehicleDocument,
  listVehicleDocuments,
  updateVehicleDocument,
} from "../lib/api";
import { trackGlow } from "../lib/glow";
import type { DocumentKind, DocumentState, VehicleDocument, VehicleWithDocuments } from "../lib/types";
import { ModalPortal } from "../components/ModalPortal";

const CARD =
  "glow float-card rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40";
const INPUT =
  "field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white";
const LABEL = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

const KIND_OPTIONS: Array<{ value: DocumentKind; label: string }> = [
  { value: "seguro", label: "Seguro" },
  { value: "revision", label: "Revisión técnica" },
  { value: "bollo", label: "Bollo" },
  { value: "tacografo", label: "Tacógrafo" },
  { value: "otro", label: "Otro documento…" },
];

const STATE_BADGE: Record<DocumentState, string> = {
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  soon: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

function describe(doc: VehicleDocument): string {
  const { state, daysLeft } = doc.status;
  if (state === "overdue") return `Vencido hace ${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? "día" : "días"}`;
  if (daysLeft === 0) return "Vence hoy";
  if (daysLeft === 1) return "Vence mañana";
  return `Vence en ${daysLeft} días`;
}

const formatDay = (day: string) => {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
};

const STATE_ORDER: Record<DocumentState, number> = { overdue: 0, soon: 1, ok: 2 };

/** Worst document of a vehicle, to sort the list: the ones that need attention come first. */
const urgency = (vehicle: VehicleWithDocuments) => Math.min(3, ...vehicle.documents.map((d) => STATE_ORDER[d.status.state]));

type Dialog = { vehicle: VehicleWithDocuments; document?: VehicleDocument };

export function VencimientosPage() {
  const [vehicles, setVehicles] = useState<VehicleWithDocuments[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const load = useCallback(() => {
    listVehicleDocuments()
      .then((list) => {
        setVehicles(list);
        setError(null);
      })
      .catch(() => setError("No se pudieron cargar los vencimientos."));
  }, []);

  useEffect(load, [load]);

  async function remove(doc: VehicleDocument) {
    if (!confirm(`¿Eliminar "${doc.name}"?`)) return;
    await deleteVehicleDocument(doc.id);
    load();
  }

  const sorted = vehicles ? [...vehicles].sort((a, b) => urgency(a) - urgency(b) || a.name.localeCompare(b.name)) : [];
  const needAttention = sorted.flatMap((v) => v.documents).filter((d) => d.status.state !== "ok").length;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Vencimientos</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Seguro, revisión, bollo, tacógrafo y lo que necesites de cada vehículo, con aviso antes de que venza.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!vehicles && !error && <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>}

      {vehicles && vehicles.length === 0 && (
        <p className={`${CARD} p-5 text-sm text-slate-600 dark:text-slate-300`}>
          Todavía no tienes vehículos. Regístralos primero en <Link to="/vehiculos" className="font-medium text-blue-600 hover:underline dark:text-blue-400">Vehículos</Link> y vuelve aquí para cargar sus documentos.
        </p>
      )}

      {vehicles && vehicles.length > 0 && (
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          {needAttention === 0
            ? "Todos tus documentos están al día."
            : `${needAttention} ${needAttention === 1 ? "documento necesita" : "documentos necesitan"} atención.`}
        </p>
      )}

      <div className="space-y-4">
        {sorted.map((vehicle) => (
          <section key={vehicle.vehicleId} onMouseMove={trackGlow} className={`${CARD} p-4`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{vehicle.name}</h2>
                {vehicle.plate && <p className="text-xs text-slate-500 dark:text-slate-400">{vehicle.plate}</p>}
              </div>
              <button
                onClick={() => setDialog({ vehicle })}
                className="brand-button flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar documento
              </button>
            </div>

            {vehicle.documents.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sin documentos cargados.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/10">
                {vehicle.documents.map((doc) => (
                  <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                        <FileCheck className="h-4 w-4 shrink-0 text-slate-400" /> {doc.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Vence el {formatDay(doc.expiresOn)}
                        {doc.notes ? ` · ${doc.notes}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATE_BADGE[doc.status.state]}`}>{describe(doc)}</span>
                      <button
                        onClick={() => setDialog({ vehicle, document: doc })}
                        aria-label="Editar"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => void remove(doc)}
                        aria-label="Eliminar"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {dialog && (
        <DocumentDialog
          dialog={dialog}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function DocumentDialog({ dialog, onClose, onSaved }: { dialog: Dialog; onClose: () => void; onSaved: () => void }) {
  const { vehicle, document } = dialog;
  const [kind, setKind] = useState<DocumentKind>(document?.kind ?? "seguro");
  const [label, setLabel] = useState(document?.label ?? "");
  const [expiresOn, setExpiresOn] = useState(document?.expiresOn ?? "");
  const [remindDays, setRemindDays] = useState(String(document?.remindDays ?? 30));
  const [notes, setNotes] = useState(document?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const input = {
      kind,
      label: kind === "otro" ? label.trim() : null,
      expiresOn,
      remindDays: Number(remindDays) || 30,
      notes: notes.trim() || null,
    };
    try {
      if (document) await updateVehicleDocument(document.id, input);
      else await createVehicleDocument(vehicle.vehicleId, input);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-white bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#111729]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {document ? "Editar documento" : "Nuevo documento"} · {vehicle.name}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={LABEL} htmlFor="doc-kind">Documento</label>
            <select id="doc-kind" value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)} className={INPUT}>
              {KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {kind === "otro" && (
            <div>
              <label className={LABEL} htmlFor="doc-label">Nombre del documento</label>
              <input id="doc-label" required maxLength={100} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej. Licencia ZTL" className={INPUT} />
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={LABEL} htmlFor="doc-date">Vence el</label>
              <input id="doc-date" type="date" required value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} className={INPUT} />
            </div>
            <div className="w-32">
              <label className={LABEL} htmlFor="doc-remind">Avisar antes</label>
              <div className="flex items-center gap-1.5">
                <input id="doc-remind" type="number" min={1} max={365} value={remindDays} onChange={(e) => setRemindDays(e.target.value)} className={INPUT} />
                <span className="text-xs text-slate-500 dark:text-slate-400">días</span>
              </div>
            </div>
          </div>
          <div>
            <label className={LABEL} htmlFor="doc-notes">Notas (opcional)</label>
            <input id="doc-notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Póliza, aseguradora…" className={INPUT} />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
            Guardar
          </button>
        </div>
      </form>
    </div>
    </ModalPortal>
  );
}
