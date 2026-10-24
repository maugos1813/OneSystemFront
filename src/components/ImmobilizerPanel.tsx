import { Lock, LockOpen } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getDeviceCommands, requestImmobilizer } from "../lib/api";
import type { DeviceCommand, DeviceCommandStatus } from "../lib/types";
import { ModalPortal } from "./ModalPortal";

const STATUS_LABEL: Record<DeviceCommandStatus, string> = {
  pending: "En espera: se enviará cuando el equipo se conecte",
  sent: "Enviada, esperando respuesta del equipo",
  confirmed: "Confirmada por el equipo",
  failed: "Falló",
  expired: "Vencida: no se pudo entregar a tiempo",
  cancelled: "Reemplazada por una orden más nueva",
};

const ACTIVE: ReadonlySet<DeviceCommandStatus> = new Set(["pending", "sent"]);
const FAST_MS = 4_000;
const SLOW_MS = 30_000;

function when(iso: string): string {
  return new Date(iso).toLocaleString();
}

/**
 * Remote lock of the vehicle through the tracker's output. The state shown is the one the device
 * reports (DOUT1), not the one we asked for, so a lock only reads "bloqueado" once it really took.
 */
export function ImmobilizerPanel({ deviceId, outputValue }: { deviceId: string; outputValue: number | string | undefined }) {
  const [commands, setCommands] = useState<DeviceCommand[]>([]);
  const [confirming, setConfirming] = useState<"lock" | "unlock" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => getDeviceCommands(deviceId).then(setCommands).catch(() => undefined), [deviceId]);
  const waiting = commands.some((command) => ACTIVE.has(command.status));

  useEffect(() => {
    void load();
    const timer = setInterval(
      () => {
        if (document.visibilityState === "visible") void load();
      },
      waiting ? FAST_MS : SLOW_MS,
    );
    return () => clearInterval(timer);
  }, [load, waiting]);

  async function confirm(action: "lock" | "unlock") {
    setBusy(true);
    setError(null);
    try {
      await requestImmobilizer(deviceId, action);
      setConfirming(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la orden");
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  }

  const locked = outputValue === undefined ? null : Number(outputValue) === 1;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">Bloqueo del vehículo</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {locked === null
              ? "Sin lectura de la salida todavía (activa Digital Output 1 en I/O del Configurator)."
              : locked
                ? "Salida activa: el vehículo está bloqueado."
                : "Salida desactivada: el vehículo está libre."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || waiting}
            onClick={() => setConfirming("lock")}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Lock className="h-4 w-4" /> Bloquear
          </button>
          <button
            type="button"
            disabled={busy || waiting}
            onClick={() => setConfirming("unlock")}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            <LockOpen className="h-4 w-4" /> Desbloquear
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {commands.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {commands.slice(0, 5).map((command) => (
            <li key={command.id} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-slate-700 dark:text-slate-300">
                <strong>{command.kind === "immobilize" ? "Bloquear" : "Desbloquear"}</strong> · {STATUS_LABEL[command.status]}
              </span>
              <span className="shrink-0 text-slate-500 dark:text-slate-400">{when(command.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}

      {confirming && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-white bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#111729]">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {confirming === "lock" ? "¿Bloquear el vehículo?" : "¿Desbloquear el vehículo?"}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {confirming === "lock"
                ? "Se cortará el arranque o la bomba de combustible. No se envía si el vehículo está en movimiento: espera a que esté detenido. Si el equipo no está conectado, la orden vence a los 5 minutos."
                : "Se vuelve a permitir el arranque. Si el equipo no está conectado, la orden espera hasta una hora."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirm(confirming)}
                className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${confirming === "lock" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {confirming === "lock" ? "Sí, bloquear" : "Sí, desbloquear"}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
