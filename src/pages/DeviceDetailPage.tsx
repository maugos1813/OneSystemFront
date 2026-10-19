import { AlertTriangle, ArrowLeft, CheckCircle2, Circle, Pencil, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { DeviceSourceBadge } from "../components/DeviceSourceBadge";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { ApiError, getDevice, updateDevice } from "../lib/api";
import { describeIo } from "../lib/avlDictionary";
import { describeEvent } from "../lib/deviceEvents";
import { buildChecklist, type CheckState } from "../lib/deviceChecklist";
import { hasSetupGuide, modelOptions, modelProfile } from "../lib/deviceModels";
import { trackGlow } from "../lib/glow";
import type { DeviceDetail } from "../lib/types";

const REFRESH_MS = 30_000;

const CARD =
  "glow float-card rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40";
const INPUT =
  "field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white";
const LABEL = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

function formatDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString() : "Nunca";
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "Nunca";
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "recién";
  if (seconds < 3600) return `hace ${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.round(seconds / 3600)} h`;
  return `hace ${Math.round(seconds / 86400)} d`;
}

const CHECK_ICON: Record<CheckState, ReactNode> = {
  ok: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />,
  warn: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />,
  pending: <Circle className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />,
};

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-900 dark:text-white">{children}</dd>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section onMouseMove={trackGlow} className={CARD}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const canEdit = (currentUser?.role === "owner" || currentUser?.role === "admin") && !currentUser.allowedArea;
  const [detail, setDetail] = useState<DeviceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState("");

  const load = useCallback(() => {
    if (!id) return Promise.resolve();
    return getDevice(id)
      .then((value) => {
        setDetail(value);
        setNow(Date.now());
        setError(null);
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError && err.status === 404 ? "No se encontró este dispositivo." : "No se pudo cargar el dispositivo."),
      );
  }, [id]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const canSeeSim = canEdit; // the SIMs section follows the same owner/admin, whole-fleet rule
  const checklist = useMemo(() => (detail ? buildChecklist(detail, now, canSeeSim) : []), [detail, now, canSeeSim]);
  const io = useMemo(() => {
    const rows = (detail?.io ?? []).map((reading) => ({ reading, ...describeIo(reading.id, reading.value) }));
    const query = filter.trim().toLowerCase();
    return query
      ? rows.filter((row) => row.name.toLowerCase().includes(query) || String(row.reading.id).includes(query))
      : rows;
  }, [detail, filter]);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
        <Link to="/dispositivos" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Dispositivos
        </Link>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }
  if (!detail) {
    return <p className="p-8 text-sm text-slate-500 dark:text-slate-400">Cargando...</p>;
  }

  const { device, vehicle, sim, lastPosition } = detail;
  const ioNumber = (code: number) => {
    const reading = detail.io.find((r) => r.id === code);
    return reading ? describeIo(code, reading.value).display : "—";
  };
  const profile = modelProfile(device.model);
  const wiredIo = [...profile.io, ...(profile.output ? [profile.output] : [])];
  const doneCount = checklist.filter((item) => item.state === "ok").length;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <Link to="/dispositivos" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:underline dark:text-slate-400">
        <ArrowLeft className="h-4 w-4" /> Dispositivos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {device.model} · {vehicle?.name ?? "Sin vehículo"}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>IMEI {device.imei}</span>
            <StatusBadge lastSeenAt={device.lastSeenAt} />
            <DeviceSourceBadge source={device.source} />
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.summary}</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section
          title="Identificación"
          action={
            canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Editar identificación"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )
          }
        >
          <dl className="divide-y divide-slate-100 dark:divide-white/10">
            <Fact label="IMEI">{device.imei}</Fact>
            <Fact label="Modelo">{device.model}</Fact>
            <Fact label="Número de serie">{device.serialNumber ?? "—"}</Fact>
            <Fact label="Firmware">{device.firmware ?? "—"}</Fact>
            <Fact label="Vehículo">
              {vehicle ? (
                <Link to="/vehiculos" className="hover:underline">
                  {vehicle.name}
                  {vehicle.plate ? ` · ${vehicle.plate}` : ""}
                </Link>
              ) : (
                "Sin asignar"
              )}
            </Fact>
            {canSeeSim && (
              <Fact label="SIM">
                {sim ? (
                  <Link to="/sims" className="hover:underline">
                    {sim.operator} · {sim.phoneNumber ?? sim.iccid}
                  </Link>
                ) : (
                  <Link to="/sims" className="text-slate-400 hover:underline">
                    Sin registrar
                  </Link>
                )}
              </Fact>
            )}
            <Fact label="Dado de alta">{formatDate(device.createdAt)}</Fact>
          </dl>
        </Section>

        <Section title="Puesta en marcha" action={<span className="text-xs text-slate-500">{doneCount} de {checklist.length}</span>}>
          <ul className="space-y-2.5">
            {checklist.map((item) => (
              <li key={item.key} className="flex gap-2.5">
                {CHECK_ICON[item.state]}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Conexión">
          <dl className="divide-y divide-slate-100 dark:divide-white/10">
            <Fact label="Estado">
              <StatusBadge lastSeenAt={device.lastSeenAt} />
            </Fact>
            <Fact label="Última conexión">
              {formatDate(device.lastSeenAt)} <span className="text-slate-400">({relativeTime(device.lastSeenAt)})</span>
            </Fact>
            <Fact label="Último dato de posición">{lastPosition ? relativeTime(lastPosition.ts) : "—"}</Fact>
            <Fact label="Señal GSM">{ioNumber(21)}</Fact>
            <Fact label="Tipo de red">{ioNumber(237)}</Fact>
            <Fact label="Estado del GPS">{ioNumber(69)}</Fact>
            <Fact label="Satélites">{lastPosition?.satellites ?? "—"}</Fact>
            <Fact label="Ubicación">
              {!lastPosition
                ? "—"
                : lastPosition.lat === 0 && lastPosition.lng === 0
                  ? "Sin ubicación (el GPS aún no tiene fix)"
                  : `${lastPosition.lat.toFixed(5)}, ${lastPosition.lng.toFixed(5)}`}
            </Fact>
          </dl>
        </Section>

        {wiredIo.length > 0 && (
          <Section title="Entradas y salidas">
            <dl className="divide-y divide-slate-100 dark:divide-white/10">
              {wiredIo.map((item) => (
                <Fact key={item.id} label={item.label}>
                  {ioNumber(item.id)}
                </Fact>
              ))}
            </dl>
            {profile.output && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                La salida solo la ves aquí; todavía no se puede activar desde el sistema (pendiente el bloqueo remoto).
              </p>
            )}
          </Section>
        )}

        <Section title="Alimentación y estado">
          <dl className="divide-y divide-slate-100 dark:divide-white/10">
            <Fact label="Voltaje del vehículo">{ioNumber(66)}</Fact>
            <Fact label="Batería interna">{ioNumber(67)}</Fact>
            <Fact label="Nivel de batería interna">{ioNumber(113)}</Fact>
            <Fact label="Ignición">{ioNumber(239)}</Fact>
            <Fact label="Movimiento">{ioNumber(240)}</Fact>
            <Fact label="Odómetro">{ioNumber(16)}</Fact>
          </dl>
        </Section>
      </div>

      {hasSetupGuide(device.model) && (
        <details onMouseMove={trackGlow} className={`${CARD} group mt-4`}>
          <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-white">
            Guía de configuración del {device.model}
          </summary>
          <div className="mt-3 space-y-4">
            {profile.setup.map((step) => (
              <div key={step.title}>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">{step.title}</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-400">
                  {step.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}

      <section onMouseMove={trackGlow} className={`${CARD} mt-4`}>
        <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Eventos y alarmas</h2>
        {detail.events.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Todavía no hay eventos. Aparecen cuando cambia la ignición o el movimiento, o cuando el equipo levanta una alarma
            (desconexión, interferencia, remolque, choque).
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {detail.events.map((event) => {
              const { label, tone } = describeEvent(event);
              return (
                <li key={`${event.id}-${event.ts}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span
                    className={
                      tone === "alarm"
                        ? "inline-flex items-center gap-1.5 font-medium text-red-600 dark:text-red-400"
                        : "text-slate-700 dark:text-slate-300"
                    }
                  >
                    {tone === "alarm" && <AlertTriangle className="h-4 w-4" />}
                    {label}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400" title={formatDate(event.ts)}>
                    {relativeTime(event.ts)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section onMouseMove={trackGlow} className={`${CARD} mt-4`}>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Lo que está enviando el equipo</h2>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar por nombre o ID"
            aria-label="Buscar elemento"
            className={`${INPUT} !w-56`}
          />
        </div>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          El último valor de cada elemento de I/O recibido (se revisan los últimos 100 registros, porque el equipo solo
          reenvía lo que cambia). Es la forma de comprobar qué activaste en el Configurator.
          {device.source === "radius_velocity" && " Este equipo viene de Radius Velocity y solo trae posición, velocidad e ignición."}
        </p>
        {detail.io.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no se recibió ningún dato de este equipo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-sm">
              <thead className="border-b border-violet-100 text-xs text-slate-500 uppercase dark:border-white/10 dark:text-slate-400">
                <tr>
                  <th className="px-2 py-2 font-medium">ID</th>
                  <th className="px-2 py-2 font-medium">Elemento</th>
                  <th className="px-2 py-2 font-medium">Valor</th>
                  <th className="px-2 py-2 font-medium">Valor crudo</th>
                  <th className="px-2 py-2 font-medium">Recibido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {io.map(({ reading, name, display, known }) => (
                  <tr key={reading.id}>
                    <td className="px-2 py-2 text-slate-500 tabular-nums dark:text-slate-400">{reading.id}</td>
                    <td className={`px-2 py-2 ${known ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>{known ? name : "Sin nombre"}</td>
                    <td className="px-2 py-2 font-medium text-slate-900 dark:text-white">{display}</td>
                    <td className="px-2 py-2 text-slate-500 tabular-nums dark:text-slate-400">{String(reading.value)}</td>
                    <td className="px-2 py-2 text-slate-500 dark:text-slate-400">{relativeTime(reading.ts)}</td>
                  </tr>
                ))}
                {io.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-3 text-slate-500 dark:text-slate-400">
                      Ningún elemento coincide con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <EditDialog
          detail={detail}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function EditDialog({ detail, onClose, onSaved }: { detail: DeviceDetail; onClose: () => void; onSaved: () => void }) {
  const { device } = detail;
  const [model, setModel] = useState(device.model);
  const [serialNumber, setSerialNumber] = useState(device.serialNumber ?? "");
  const [firmware, setFirmware] = useState(device.firmware ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await updateDevice(device.id, { model, serialNumber: serialNumber.trim(), firmware: firmware.trim() });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-white bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#111729]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Editar dispositivo</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={LABEL} htmlFor="model">Modelo</label>
            <select id="model" value={model} onChange={(e) => setModel(e.target.value)} className={INPUT}>
              {modelOptions(device.model).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="serial">Número de serie (S/N)</label>
            <input id="serial" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} maxLength={32} placeholder="1164718028" className={INPUT} />
          </div>
          <div>
            <label className={LABEL} htmlFor="firmware">Firmware</label>
            <input id="firmware" value={firmware} onChange={(e) => setFirmware(e.target.value)} maxLength={32} placeholder="Ej. 03.28.07" className={INPUT} />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
