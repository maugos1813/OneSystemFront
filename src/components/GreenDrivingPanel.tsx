import { Activity } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getDeviceCommands, requestGreenDriving } from "../lib/api";
import type { DeviceCommand, DeviceCommandStatus } from "../lib/types";
import { ModalPortal } from "./ModalPortal";

/** The models whose Green Driving parameters are in Teltonika's own lists (same as the server). */
const GREEN_DRIVING_MODELS: ReadonlySet<string> = new Set(["FMB204", "FMC003", "FMB920"]);

export function supportsGreenDriving(model: string, source: string): boolean {
  return source === "teltonika" && GREEN_DRIVING_MODELS.has(model);
}

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

/**
 * Switches on the tracker's own measurement of harsh acceleration, braking and cornering (Teltonika "Green Driving", read with its
 * accelerometer). Conducción counts those events — the way Radius Velocity scores — from the moment the device confirms.
 */
export function GreenDrivingPanel({ deviceId, since, onChanged }: { deviceId: string; since: string | null | undefined; onChanged: () => void }) {
  const [commands, setCommands] = useState<DeviceCommand[]>([]);
  const [confirming, setConfirming] = useState<"enable" | "disable" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () => getDeviceCommands(deviceId).then((all) => setCommands(all.filter((c) => c.kind === "green_driving"))).catch(() => undefined),
    [deviceId],
  );
  const waiting = commands.some((command) => ACTIVE.has(command.status));
  const wasWaiting = commands.length > 0 && commands[0] && !ACTIVE.has(commands[0].status);

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

  // When an order finishes, the sheet re-reads the device: "activa desde" comes from the device itself.
  useEffect(() => {
    if (wasWaiting) onChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the latest order stops waiting
  }, [wasWaiting, commands[0]?.id, commands[0]?.status]);

  async function confirm(action: "enable" | "disable") {
    setBusy(true);
    setError(null);
    try {
      await requestGreenDriving(deviceId, action);
      setConfirming(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la orden");
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  }

  const active = !!since;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-white">
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Medición de conducción del equipo
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {active
              ? `Activa desde ${new Date(since!).toLocaleString()}: el equipo detecta él mismo las aceleraciones, frenadas y curvas bruscas y Conducción puntúa con ellas.`
              : "Desactivada: este equipo no avisa de aceleraciones, frenadas ni curvas bruscas. Conducción las deduce del GPS."}
          </p>
        </div>
        <button
          type="button"
          disabled={busy || waiting}
          onClick={() => setConfirming(active ? "disable" : "enable")}
          className={
            active
              ? "rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              : "brand-button rounded-xl px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          }
        >
          {active ? "Desactivar" : "Activar"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {commands.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {commands.slice(0, 3).map((command) => (
            <li key={command.id} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-slate-700 dark:text-slate-300">
                <strong>{command.command.includes("11000:0") ? "Desactivar" : "Activar"}</strong> · {STATUS_LABEL[command.status]}
              </span>
              <span className="shrink-0 text-slate-500 dark:text-slate-400">{new Date(command.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}

      {confirming && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-2xl border border-white bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#111729]">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {confirming === "enable" ? "¿Activar la medición de conducción?" : "¿Desactivar la medición de conducción?"}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {confirming === "enable"
                  ? "Se cambian ajustes del equipo (Green Driving): el acelerómetro mide aceleraciones de 3 m/s² o más, frenadas de 3,5 y curvas de 4. Para que midan bien, el equipo debe ir fijo y lo más nivelado posible. Conducción puntuará con estos eventos desde que el equipo confirme; hasta tener 2 horas de conducción medidas, sigue usando el GPS."
                  : "Se apaga la medición del equipo y Conducción vuelve a deducir los eventos del GPS."}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Si el equipo no está conectado, la orden espera hasta 24 horas. Se puede volver a desactivar cuando quieras.
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
                  className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {confirming === "enable" ? "Sí, activar" : "Sí, desactivar"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
