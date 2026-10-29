import { ChevronDown, ChevronRight, Gauge, History, Pencil, Plus, Trash2, Wrench, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import {
  calibrateOdometer,
  createMaintenancePlan,
  deleteMaintenancePlan,
  listMaintenance,
  listMaintenanceRecords,
  registerMaintenanceService,
  updateMaintenancePlan,
} from "../lib/api";
import { trackGlow } from "../lib/glow";
import {
  describeRemaining,
  formatKm,
  PLAN_TEMPLATES,
  STATE_BADGE,
  STATE_BAR,
  STATE_LABEL,
  type PlanTemplate,
} from "../lib/maintenance";
import type { MaintenanceRecord, MaintenanceState, VehicleMaintenance, MaintenancePlan } from "../lib/types";
import { ModalPortal } from "../components/ModalPortal";

const CARD =
  "glow float-card rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40";
const INPUT =
  "field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white";
const LABEL = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";
const GHOST_BUTTON =
  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10";

const STATE_ORDER: Record<MaintenanceState, number> = { overdue: 0, soon: 1, ok: 2, unknown: 3 };

type Dialog =
  | { kind: "plan"; vehicle: VehicleMaintenance; plan?: MaintenancePlan }
  | { kind: "service"; vehicle: VehicleMaintenance; plan: MaintenancePlan }
  | { kind: "odometer"; vehicle: VehicleMaintenance };

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** A past day as an ISO instant (local noon, so it lands on that day anywhere); today is left
 * out so the server stamps the real moment instead of a time that may still be in the future. */
function dayToIso(value: string): string | undefined {
  if (!value || value === todayLocal()) return undefined;
  return new Date(`${value}T12:00:00`).toISOString();
}

const formatDay = (iso: string) => new Date(iso).toLocaleDateString("es-AR");

function intervalText(plan: MaintenancePlan): string {
  const parts: string[] = [];
  if (plan.intervalKm) parts.push(formatKm(plan.intervalKm));
  if (plan.intervalMonths) parts.push(plan.intervalMonths === 1 ? "1 mes" : `${plan.intervalMonths} meses`);
  return `Cada ${parts.join(" o ")}`;
}

function worstState(vehicle: VehicleMaintenance): MaintenanceState {
  return vehicle.plans.reduce<MaintenanceState>(
    (worst, plan) => (STATE_ORDER[plan.status.state] < STATE_ORDER[worst] ? plan.status.state : worst),
    "unknown",
  );
}

export function MaintenancePage() {
  const { currentUser } = useAuth();
  const canManage = currentUser?.role === "owner" || currentUser?.role === "admin" || currentUser?.role === "manager";
  const [vehicles, setVehicles] = useState<VehicleMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    listMaintenance()
      .then((rows) => {
        setVehicles(rows);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo cargar el mantenimiento"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(
    () =>
      [...vehicles].sort(
        (a, b) => STATE_ORDER[worstState(a)] - STATE_ORDER[worstState(b)] || a.name.localeCompare(b.name),
      ),
    [vehicles],
  );
  // Spaces and case do not matter: "er643 vy" finds ER643VY.
  const shown = useMemo(() => {
    const q = search.toLowerCase().replace(/\s/g, "");
    if (!q) return sorted;
    return sorted.filter((v) => `${v.name}${v.plate ?? ""}`.toLowerCase().replace(/\s/g, "").includes(q));
  }, [sorted, search]);
  const counts = useMemo(() => {
    const all = vehicles.flatMap((v) => v.plans);
    return {
      overdue: all.filter((p) => p.status.state === "overdue").length,
      soon: all.filter((p) => p.status.state === "soon").length,
      total: all.length,
    };
  }, [vehicles]);

  function closeAndReload() {
    setDialog(null);
    load();
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Mantenimiento</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Planes de servicio por vehículo (aceite, neumáticos, revisión…), medidos con el kilometraje que informa el tracker y con
        fechas. Lo que primero se cumpla es lo que cuenta.
      </p>

      {!loading && counts.total > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 dark:bg-red-500/15 dark:text-red-400">
            {counts.overdue} vencidos
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            {counts.soon} próximos
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
            {counts.total} planes en total
          </span>
        </div>
      )}

      {vehicles.length > 1 && (
        <div className="mb-4 flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar placa…"
            aria-label="Buscar vehículo por placa"
            className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-72 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          {search && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {shown.length} de {vehicles.length}
            </span>
          )}
        </div>
      )}

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!loading && !error && vehicles.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">No hay vehículos. Agrégalos primero en la página Vehículos.</p>
      )}

      {search && shown.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Ningún vehículo coincide con «{search}».</p>
      )}

      <div className="space-y-4">
        {shown.map((vehicle) => (
          <VehicleCard key={vehicle.vehicleId} vehicle={vehicle} canManage={canManage} onDialog={setDialog} onChanged={load} />
        ))}
      </div>

      {dialog?.kind === "plan" && <PlanDialog dialog={dialog} onClose={() => setDialog(null)} onDone={closeAndReload} />}
      {dialog?.kind === "service" && <ServiceDialog dialog={dialog} onClose={() => setDialog(null)} onDone={closeAndReload} />}
      {dialog?.kind === "odometer" && <OdometerDialog dialog={dialog} onClose={() => setDialog(null)} onDone={closeAndReload} />}
    </div>
  );
}

function VehicleCard({
  vehicle,
  canManage,
  onDialog,
  onChanged,
}: {
  vehicle: VehicleMaintenance;
  canManage: boolean;
  onDialog: (dialog: Dialog) => void;
  onChanged: () => void;
}) {
  return (
    <section onMouseMove={trackGlow} className={`${CARD} p-4`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">
            {vehicle.name}
            {vehicle.plate && <span className="ml-2 text-sm font-normal text-slate-500">{vehicle.plate}</span>}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <Gauge className="h-4 w-4" />
            {vehicle.odometerKm !== null ? formatKm(vehicle.odometerKm) : "Sin lectura de kilometraje"}
            {canManage && vehicle.trackerKm !== null && (
              <button type="button" onClick={() => onDialog({ kind: "odometer", vehicle })} className="ml-1 underline hover:no-underline">
                Calibrar con el tablero
              </button>
            )}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => onDialog({ kind: "plan", vehicle })}
            className="brand-button inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Nuevo plan
          </button>
        )}
      </div>

      {vehicle.plans.length === 0 ? (
        <p className="text-sm text-slate-400">Sin planes de mantenimiento.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {vehicle.plans.map((plan) => (
            <PlanRow key={plan.id} vehicle={vehicle} plan={plan} canManage={canManage} onDialog={onDialog} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PlanRow({
  vehicle,
  plan,
  canManage,
  onDialog,
  onChanged,
}: {
  vehicle: VehicleMaintenance;
  plan: MaintenancePlan;
  canManage: boolean;
  onDialog: (dialog: Dialog) => void;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<MaintenanceRecord[] | null>(null);
  const { status } = plan;
  const percent = Math.min(100, Math.round((status.usedFraction ?? 0) * 100));

  function toggleHistory() {
    const next = !open;
    setOpen(next);
    if (next && records === null) {
      listMaintenanceRecords(plan.id)
        .then(setRecords)
        .catch(() => setRecords([]));
    }
  }

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar "${plan.name}" y todo su historial?`)) return;
    await deleteMaintenancePlan(plan.id);
    onChanged();
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
            <Wrench className="h-4 w-4 text-slate-400" />
            {plan.name}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_BADGE[status.state]}`}>{STATE_LABEL[status.state]}</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {intervalText(plan)}
            {plan.lastDoneAt && (
              <>
                {" · "}Último: {formatDay(plan.lastDoneAt)}
                {plan.lastDoneKm !== null && ` a ${formatKm(plan.lastDoneKm)}`}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {canManage && (
            <button type="button" onClick={() => onDialog({ kind: "service", vehicle, plan })} className={`${GHOST_BUTTON} !text-violet-600 dark:!text-violet-300`}>
              Registrar servicio
            </button>
          )}
          <button type="button" onClick={toggleHistory} className={GHOST_BUTTON} aria-expanded={open}>
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />} Historial
          </button>
          {canManage && (
            <>
              <button type="button" onClick={() => onDialog({ kind: "plan", vehicle, plan })} className={GHOST_BUTTON} aria-label={`Editar ${plan.name}`}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => void handleDelete()} className={`${GHOST_BUTTON} hover:!text-red-600`} aria-label={`Eliminar ${plan.name}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${STATE_BAR[status.state]}`} style={{ width: `${status.state === "unknown" ? 0 : percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {describeRemaining(status)}
        {status.dueKm !== null && ` · toca a los ${formatKm(status.dueKm)}`}
        {status.dueDate && ` · hasta el ${formatDay(status.dueDate)}`}
      </p>

      {open && (
        <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/5">
          {records === null && <p className="text-slate-500">Cargando…</p>}
          {records !== null && records.length === 0 && <p className="text-slate-500">Todavía no se registró ningún servicio.</p>}
          {records !== null && records.length > 0 && (
            <ul className="space-y-1.5">
              {records.map((record) => (
                <li key={record.id} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>
                    {formatDay(record.doneAt)}
                    {record.odometerKm !== null && ` · ${formatKm(record.odometerKm)}`}
                    {record.notes && <span className="text-slate-500"> — {record.notes}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {plan.notes && <p className="mt-2 text-slate-500">Notas del plan: {plan.notes}</p>}
        </div>
      )}
    </li>
  );
}

function Modal({ title, onClose, onSubmit, submitting, error, submitLabel, children }: {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  submitting: boolean;
  error: string | null;
  submitLabel: string;
  children: ReactNode;
}) {
  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <form
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#111729]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">{children}</div>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
    </ModalPortal>
  );
}

/** Runs a save and reports a failure inline; the dialog closes only on success. */
function useSubmit(onDone: () => void) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<unknown>) {
    setSubmitting(true);
    setError(null);
    try {
      await action();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSubmitting(false);
    }
  }
  return { submitting, error, run };
}

const toInt = (value: string): number | null => {
  const trimmed = value.trim().replace(/\./g, "");
  return trimmed === "" ? null : Number(trimmed);
};

function PlanDialog({ dialog, onClose, onDone }: { dialog: Extract<Dialog, { kind: "plan" }>; onClose: () => void; onDone: () => void }) {
  const { vehicle, plan } = dialog;
  const [name, setName] = useState(plan?.name ?? "");
  const [intervalKm, setIntervalKm] = useState(plan?.intervalKm?.toString() ?? "");
  const [intervalMonths, setIntervalMonths] = useState(plan?.intervalMonths?.toString() ?? "");
  const [lastDoneAt, setLastDoneAt] = useState("");
  const [lastDoneKm, setLastDoneKm] = useState("");
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const { submitting, error, run } = useSubmit(onDone);

  function applyTemplate(template: PlanTemplate) {
    setName(template.name);
    setIntervalKm(template.intervalKm?.toString() ?? "");
    setIntervalMonths(template.intervalMonths?.toString() ?? "");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const km = toInt(intervalKm);
    const months = toInt(intervalMonths);
    void run(() => {
      if (plan) return updateMaintenancePlan(plan.id, { name, intervalKm: km, intervalMonths: months, notes });
      return createMaintenancePlan(vehicle.vehicleId, {
        name,
        intervalKm: km,
        intervalMonths: months,
        notes,
        lastDoneAt: dayToIso(lastDoneAt),
        lastDoneKm: toInt(lastDoneKm),
      });
    });
  }

  return (
    <Modal
      title={plan ? "Editar plan" : `Nuevo plan · ${vehicle.name}`}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      submitLabel={plan ? "Guardar" : "Crear plan"}
    >
      {!plan && (
        <div className="flex flex-wrap gap-1.5">
          {PLAN_TEMPLATES.map((template) => (
            <button
              key={template.name}
              type="button"
              onClick={() => applyTemplate(template)}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              {template.name}
            </button>
          ))}
        </div>
      )}
      <div>
        <label className={LABEL} htmlFor="plan-name">Servicio</label>
        <input id="plan-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Cambio de aceite" className={INPUT} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor="plan-km">Cada (km)</label>
          <input id="plan-km" inputMode="numeric" value={intervalKm} onChange={(e) => setIntervalKm(e.target.value)} placeholder="15000" className={INPUT} />
        </div>
        <div>
          <label className={LABEL} htmlFor="plan-months">Cada (meses)</label>
          <input id="plan-months" inputMode="numeric" value={intervalMonths} onChange={(e) => setIntervalMonths(e.target.value)} placeholder="12" className={INPUT} />
        </div>
      </div>
      <p className="-mt-1 text-xs text-slate-500 dark:text-slate-400">Completa uno o los dos; lo que primero se cumpla marca el vencimiento.</p>
      {!plan && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL} htmlFor="plan-last-at">Última vez (fecha)</label>
            <input id="plan-last-at" type="date" max={todayLocal()} value={lastDoneAt} onChange={(e) => setLastDoneAt(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL} htmlFor="plan-last-km">Última vez (km)</label>
            <input id="plan-last-km" inputMode="numeric" value={lastDoneKm} onChange={(e) => setLastDoneKm(e.target.value)} placeholder={vehicle.odometerKm?.toString() ?? ""} className={INPUT} />
          </div>
        </div>
      )}
      {!plan && <p className="-mt-1 text-xs text-slate-500 dark:text-slate-400">Si los dejas vacíos, empieza a contar desde hoy con el kilometraje actual.</p>}
      <div>
        <label className={LABEL} htmlFor="plan-notes">Notas</label>
        <input id="plan-notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className={INPUT} />
      </div>
    </Modal>
  );
}

function ServiceDialog({ dialog, onClose, onDone }: { dialog: Extract<Dialog, { kind: "service" }>; onClose: () => void; onDone: () => void }) {
  const { vehicle, plan } = dialog;
  const [doneAt, setDoneAt] = useState(todayLocal());
  const [odometerKm, setOdometerKm] = useState("");
  const [notes, setNotes] = useState("");
  const { submitting, error, run } = useSubmit(onDone);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const km = toInt(odometerKm);
    void run(() => registerMaintenanceService(plan.id, { doneAt: dayToIso(doneAt), ...(km !== null ? { odometerKm: km } : {}), notes }));
  }

  const isToday = doneAt === todayLocal();
  return (
    <Modal title={`Registrar servicio · ${plan.name}`} onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error} submitLabel="Registrar">
      <p className="text-sm text-slate-500 dark:text-slate-400">{vehicle.name}</p>
      <div>
        <label className={LABEL} htmlFor="svc-date">Fecha</label>
        <input id="svc-date" type="date" required max={todayLocal()} value={doneAt} onChange={(e) => setDoneAt(e.target.value)} className={INPUT} />
      </div>
      <div>
        <label className={LABEL} htmlFor="svc-km">Kilometraje</label>
        <input
          id="svc-km"
          inputMode="numeric"
          value={odometerKm}
          onChange={(e) => setOdometerKm(e.target.value)}
          placeholder={isToday && vehicle.odometerKm !== null ? `${vehicle.odometerKm} (actual)` : ""}
          className={INPUT}
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {isToday ? "Si lo dejas vacío usa el kilometraje actual." : "Para una fecha pasada, indica el kilometraje de ese día (o déjalo vacío)."}
        </p>
      </div>
      <div>
        <label className={LABEL} htmlFor="svc-notes">Notas</label>
        <input id="svc-notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Taller, repuestos, costo…" className={INPUT} />
      </div>
    </Modal>
  );
}

function OdometerDialog({ dialog, onClose, onDone }: { dialog: Extract<Dialog, { kind: "odometer" }>; onClose: () => void; onDone: () => void }) {
  const { vehicle } = dialog;
  const [dashboardKm, setDashboardKm] = useState("");
  const { submitting, error, run } = useSubmit(onDone);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const km = toInt(dashboardKm);
    if (km === null) return;
    void run(() => calibrateOdometer(vehicle.vehicleId, km));
  }

  return (
    <Modal title={`Calibrar odómetro · ${vehicle.name}`} onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error} submitLabel="Calibrar">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        El tracker cuenta los km desde que se instaló, no desde que el auto es nuevo. Indica lo que marca hoy el tablero y los planes
        se medirán con ese número.
      </p>
      <dl className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
        <div className="flex justify-between"><dt className="text-slate-500">Lee el tracker</dt><dd className="font-medium">{vehicle.trackerKm !== null ? formatKm(vehicle.trackerKm) : "—"}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Ajuste actual</dt><dd className="font-medium">{vehicle.offsetKm >= 0 ? "+" : ""}{formatKm(vehicle.offsetKm)}</dd></div>
      </dl>
      <div>
        <label className={LABEL} htmlFor="dash-km">Kilometraje del tablero</label>
        <input id="dash-km" required inputMode="numeric" value={dashboardKm} onChange={(e) => setDashboardKm(e.target.value)} placeholder="85000" className={INPUT} />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">Los kilómetros ya guardados en los planes se corrigen con el mismo ajuste, para que sigan significando lo mismo.</p>
    </Modal>
  );
}
