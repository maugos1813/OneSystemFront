import { OBD_IO_IDS } from "./avlDictionary";
import type { DeviceDetail } from "./types";

export type CheckState = "ok" | "warn" | "pending";

export interface CheckItem {
  key: string;
  label: string;
  state: CheckState;
  /** What was found, or what to do to fix it. */
  detail: string;
}

/** A device that talked to us in the last 10 minutes counts as "on now" for the checklist
 * (the fleet badge uses a tighter 2 minutes; a parked tracker reports less often). */
const ONLINE_WINDOW_MS = 10 * 60 * 1000;
const MIN_SATELLITES = 4;

function ioValue(detail: DeviceDetail, id: number): number | string | undefined {
  return detail.io.find((reading) => reading.id === id)?.value;
}

/** The "puesta en marcha" list of a new tracker: the things that must be true before it is
 * really useful. `canSeeSim` is false for accounts that don't get the SIMs section. */
export function buildChecklist(detail: DeviceDetail, nowMs: number, canSeeSim: boolean): CheckItem[] {
  const { device, vehicle, sim, lastPosition } = detail;
  const items: CheckItem[] = [];

  const seenMs = device.lastSeenAt ? nowMs - new Date(device.lastSeenAt).getTime() : null;
  items.push(
    seenMs === null
      ? {
          key: "connected",
          label: "Se conectó al servidor",
          state: "pending",
          detail: "Todavía no llegó nada. Revisa el servidor, el puerto y el APN en el Configurator.",
        }
      : {
          key: "connected",
          label: "Se conectó al servidor",
          state: seenMs <= ONLINE_WINDOW_MS ? "ok" : "warn",
          detail:
            seenMs <= ONLINE_WINDOW_MS
              ? "Está enviando datos ahora."
              : "Ya se conectó antes, pero hace más de 10 minutos que no envía.",
        },
  );

  const satellites = lastPosition?.satellites ?? null;
  const hasCoordinates = !!lastPosition && !(lastPosition.lat === 0 && lastPosition.lng === 0);
  const gnssStatus = ioValue(detail, 69);
  items.push(
    !lastPosition
      ? { key: "gps", label: "Tiene señal de GPS", state: "pending", detail: "Sin posiciones todavía." }
      : hasCoordinates && (satellites === null || satellites >= MIN_SATELLITES)
        ? {
            key: "gps",
            label: "Tiene señal de GPS",
            state: "ok",
            detail: satellites === null ? "Posición recibida." : `${satellites} satélites.`,
          }
        : {
            key: "gps",
            label: "Tiene señal de GPS",
            state: "warn",
            detail:
              gnssStatus !== undefined && Number(gnssStatus) !== 2
                ? "El GPS no tiene fix. En un equipo OBD, sácalo del tablero o ubícalo con vista al cielo."
                : `Solo ${satellites ?? 0} satélites; se necesitan al menos ${MIN_SATELLITES}.`,
          },
  );

  const voltage = ioValue(detail, 66);
  items.push(
    voltage === undefined
      ? {
          key: "power",
          label: "Lee la alimentación del vehículo",
          state: "pending",
          detail: "No llega el voltaje externo (ID 66). Actívalo en el Configurator.",
        }
      : {
          key: "power",
          label: "Lee la alimentación del vehículo",
          state: "ok",
          detail: `${(Number(voltage) / 1000).toLocaleString("es-AR", { maximumFractionDigits: 2 })} V.`,
        },
  );

  const obd = detail.io.filter((reading) => OBD_IO_IDS.has(reading.id));
  items.push(
    obd.length > 0
      ? { key: "obd", label: "Envía datos del motor (OBD)", state: "ok", detail: obd.length === 1 ? "1 elemento de OBD llegando." : `${obd.length} elementos de OBD llegando.` }
      : {
          key: "obd",
          label: "Envía datos del motor (OBD)",
          state: "pending",
          detail: "Aún no llegan. Se activan en el Configurator (pestaña OBD) y el equipo debe estar en el puerto del vehículo.",
        },
  );

  items.push(
    vehicle
      ? { key: "vehicle", label: "Está asignado a un vehículo", state: "ok", detail: vehicle.name }
      : { key: "vehicle", label: "Está asignado a un vehículo", state: "pending", detail: "Asígnalo desde Vehículos." },
  );

  if (canSeeSim) {
    items.push(
      sim
        ? { key: "sim", label: "Tiene la SIM registrada", state: "ok", detail: sim.phoneNumber ?? sim.iccid }
        : { key: "sim", label: "Tiene la SIM registrada", state: "pending", detail: "Cárgala en la sección SIMs para controlar los datos." },
    );
  }

  items.push(
    device.serialNumber
      ? { key: "serial", label: "Tiene el número de serie cargado", state: "ok", detail: device.serialNumber }
      : { key: "serial", label: "Tiene el número de serie cargado", state: "pending", detail: "Está impreso en la etiqueta (S/N)." },
  );

  return items;
}
