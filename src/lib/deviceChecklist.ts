import { bi, currentLocale } from "../i18n";
import { OBD_IO_IDS } from "./avlDictionary";
import { modelProfile } from "./deviceModels";
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
  const profile = modelProfile(device.model);
  const items: CheckItem[] = [];

  const seenMs = device.lastSeenAt ? nowMs - new Date(device.lastSeenAt).getTime() : null;
  items.push(
    seenMs === null
      ? {
          key: "connected",
          label: bi("Se conectó al servidor", "Si è collegato al server"),
          state: "pending",
          detail: bi("Todavía no llegó nada. Revisa el servidor, el puerto y el APN en el Configurator.", "Non è ancora arrivato nulla. Controlla il server, la porta e l'APN nel Configurator."),
        }
      : {
          key: "connected",
          label: bi("Se conectó al servidor", "Si è collegato al server"),
          state: seenMs <= ONLINE_WINDOW_MS ? "ok" : "warn",
          detail:
            seenMs <= ONLINE_WINDOW_MS
              ? bi("Está enviando datos ahora.", "Sta inviando dati adesso.")
              : bi("Ya se conectó antes, pero hace más de 10 minutos que no envía.", "Si è già collegato prima, ma da più di 10 minuti non invia."),
        },
  );

  const satellites = lastPosition?.satellites ?? null;
  const hasCoordinates = !!lastPosition && !(lastPosition.lat === 0 && lastPosition.lng === 0);
  const gnssStatus = ioValue(detail, 69);
  items.push(
    !lastPosition
      ? { key: "gps", label: bi("Tiene señal de GPS", "Ha il segnale GPS"), state: "pending", detail: bi("Sin posiciones todavía.", "Nessuna posizione ancora.") }
      : hasCoordinates && (satellites === null || satellites >= MIN_SATELLITES)
        ? {
            key: "gps",
            label: bi("Tiene señal de GPS", "Ha il segnale GPS"),
            state: "ok",
            detail: satellites === null ? bi("Posición recibida.", "Posizione ricevuta.") : bi(`${satellites} satélites.`, `${satellites} satelliti.`),
          }
        : {
            key: "gps",
            label: bi("Tiene señal de GPS", "Ha il segnale GPS"),
            state: "warn",
            detail:
              gnssStatus !== undefined && Number(gnssStatus) !== 1
                ? bi("El GPS no tiene fix. En un equipo OBD, sácalo del tablero o ubícalo con vista al cielo.", "Il GPS non ha il fix. Con un apparecchio OBD, toglilo dal cruscotto o mettilo con vista sul cielo.")
                : bi(`Solo ${satellites ?? 0} satélites; se necesitan al menos ${MIN_SATELLITES}.`, `Solo ${satellites ?? 0} satelliti; ne servono almeno ${MIN_SATELLITES}.`),
          },
  );

  const voltage = ioValue(detail, 66);
  items.push(
    voltage === undefined
      ? {
          key: "power",
          label: bi("Lee la alimentación del vehículo", "Legge l'alimentazione del veicolo"),
          state: "pending",
          detail: bi("No llega el voltaje externo (ID 66). Actívalo en el Configurator.", "Non arriva la tensione esterna (ID 66). Attivala nel Configurator."),
        }
      : {
          key: "power",
          label: bi("Lee la alimentación del vehículo", "Legge l'alimentazione del veicolo"),
          state: "ok",
          detail: `${(Number(voltage) / 1000).toLocaleString(currentLocale(), { maximumFractionDigits: 2 })} V.`,
        },
  );

  if (profile.obd) {
    const obd = detail.io.filter((reading) => OBD_IO_IDS.has(reading.id));
    items.push(
      obd.length > 0
        ? { key: "obd", label: bi("Envía datos del motor (OBD)", "Invia i dati del motore (OBD)"), state: "ok", detail: obd.length === 1 ? bi("1 elemento de OBD llegando.", "1 elemento OBD in arrivo.") : bi(`${obd.length} elementos de OBD llegando.`, `${obd.length} elementi OBD in arrivo.`) }
        : {
            key: "obd",
            label: bi("Envía datos del motor (OBD)", "Invia i dati del motore (OBD)"),
            state: "pending",
            detail: bi("Aún no llegan. Se activan en el Configurator (pestaña OBD) y el equipo debe estar en el puerto del vehículo.", "Non arrivano ancora. Si attivano nel Configurator (scheda OBD) e l'apparecchio deve essere nella porta del veicolo."),
          },
    );
  }

  if (profile.ignitionWire) {
    const ignition = ioValue(detail, 239);
    items.push(
      ignition === undefined
        ? {
            key: "ignition",
            label: bi("Lee la ignición", "Legge l'accensione"),
            state: "pending",
            detail: bi("No llega la ignición (ID 239). Revisa el cable amarillo (DIN1) y que Ignition Source sea DIN1.", "Non arriva l'accensione (ID 239). Controlla il cavo giallo (DIN1) e che Ignition Source sia DIN1."),
          }
        : { key: "ignition", label: bi("Lee la ignición", "Legge l'accensione"), state: "ok", detail: Number(ignition) === 1 ? bi("Encendida.", "Accesa.") : bi("Apagada.", "Spenta.") },
    );
  }

  items.push(
    vehicle
      ? { key: "vehicle", label: bi("Está asignado a un vehículo", "È assegnato a un veicolo"), state: "ok", detail: vehicle.name }
      : { key: "vehicle", label: bi("Está asignado a un vehículo", "È assegnato a un veicolo"), state: "pending", detail: bi("Asígnalo desde Vehículos.", "Assegnalo da Veicoli.") },
  );

  if (canSeeSim) {
    items.push(
      sim
        ? { key: "sim", label: bi("Tiene la SIM registrada", "Ha la SIM registrata"), state: "ok", detail: sim.phoneNumber ?? sim.iccid }
        : { key: "sim", label: bi("Tiene la SIM registrada", "Ha la SIM registrata"), state: "pending", detail: bi("Cárgala en la sección SIMs para controlar los datos.", "Caricala nella sezione SIM per controllare i dati.") },
    );
  }

  items.push(
    device.serialNumber
      ? { key: "serial", label: bi("Tiene el número de serie cargado", "Ha il numero di serie caricato"), state: "ok", detail: device.serialNumber }
      : { key: "serial", label: bi("Tiene el número de serie cargado", "Ha il numero di serie caricato"), state: "pending", detail: bi("Está impreso en la etiqueta (S/N).", "È stampato sull'etichetta (S/N).") },
  );

  return items;
}
