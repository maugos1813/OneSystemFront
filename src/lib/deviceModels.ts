import { bi } from "../i18n";

/** Models offered in the pickers. The tracker never reports its own model, so a person picks it. */
export const DEVICE_MODELS = ["FMB204", "FMC003", "FTC920", "FTC880", "FMB920", "FMC130", "FMC150", "Otro"] as const;

/** The picker options for a device, keeping a model that isn't in the list (legacy rows). */
export function modelOptions(current: string): string[] {
  return DEVICE_MODELS.includes(current as (typeof DEVICE_MODELS)[number]) ? [...DEVICE_MODELS] : [current, ...DEVICE_MODELS];
}

/** An AVL element a model's wiring or sensors produce, shown in the "Entradas y salidas" card. */
export interface ModelIo {
  id: number;
  label: string;
}

export interface SetupStep {
  title: string;
  /** What to set in the Configurator, one line each. */
  lines: string[];
}

/**
 * What a model can do, so the Dispositivos screens show what that unit actually has instead of one
 * generic sheet. Anything not listed (or "Otro") gets the generic profile: nothing hidden.
 */
export interface ModelProfile {
  /** One line under the model name. */
  summary: string;
  /** Plugs into the OBD port and reads engine data. */
  obd: boolean;
  /** Wired I/O whose state is worth showing next to the power section. */
  io: ModelIo[];
  /** A digital output that can drive a relay (immobilizer, siren…). Shown with its state. */
  output: ModelIo | null;
  /** The ignition comes from a wire (DIN1) rather than from the OBD port or the voltage. */
  ignitionWire: boolean;
  /** Configurator guidance specific to this model. */
  setup: SetupStep[];
}

const generic = (): ModelProfile => ({
  summary: bi("Modelo sin perfil propio: se muestran todos los datos.", "Modello senza profilo proprio: vengono mostrati tutti i dati."),
  obd: true,
  io: [],
  output: null,
  ignitionWire: false,
  setup: [],
});

export const SERVER_HOST = "tramway.proxy.rlwy.net";
export const SERVER_PORT = "26090";

const profiles = (): Record<string, ModelProfile> => ({
  FMC003: {
    summary: bi("Tracker OBD plug-and-play, LTE Cat 1, con Bluetooth.", "Tracker OBD plug-and-play, LTE Cat 1, con Bluetooth."),
    obd: true,
    io: [],
    output: null,
    ignitionWire: false,
    setup: [],
  },
  FTC920: {
    summary: bi("Tracker cableado LTE Cat 1 con batería interna, 2 entradas y 1 salida para relé. No tiene puerto OBD.", "Tracker cablato LTE Cat 1 con batteria interna, 2 ingressi e 1 uscita per relè. Non ha la porta OBD."),
    obd: false,
    io: [
      { id: 1, label: bi("DIN1 · ignición (cable amarillo)", "DIN1 · accensione (cavo giallo)") },
      { id: 2, label: bi("DIN2 (cable gris)", "DIN2 (cavo grigio)") },
      { id: 9, label: bi("AIN1 · entrada analógica (cable gris)", "AIN1 · ingresso analogico (cavo grigio)") },
    ],
    output: { id: 179, label: bi("DOUT1 · salida (cable blanco)", "DOUT1 · uscita (cavo bianco)") },
    ignitionWire: true,
    setup: [
      {
        title: bi("1. Instalación (según la etiqueta del equipo)", "1. Installazione (secondo l'etichetta dell'apparecchio)"),
        lines: [
          bi("Rojo: +10…30 V (siempre vivo, con fusible de 3 A).", "Rosso: +10…30 V (sempre sotto tensione, con fusibile da 3 A)."),
          bi("Negro: GND (masa del vehículo).", "Nero: GND (massa del veicolo)."),
          bi("Amarillo (DIN1): señal de contacto/ignición (+12 V solo con la llave en ON).", "Giallo (DIN1): segnale di contatto/accensione (+12 V solo con la chiave su ON)."),
          bi("Blanco (DOUT1): salida a colector abierto, máx. 0,5 A. Va a la bobina de un relé, nunca directo a la carga.", "Bianco (DOUT1): uscita a collettore aperto, max 0,5 A. Va alla bobina di un relè, mai direttamente al carico."),
          bi("Montarlo con la cara marcada “MOUNT THIS SIDE UP” hacia arriba.", "Montarlo con il lato contrassegnato “MOUNT THIS SIDE UP” rivolto verso l'alto."),
          bi("SIM con datos (LTE Cat 1): insertarla con el equipo sin alimentación; con el equipo encendido puede no detectarse.", "SIM con dati (LTE Cat 1): inserirla con l'apparecchio non alimentato; con l'apparecchio acceso potrebbe non essere rilevata."),
        ],
      },
      {
        title: bi("2. Servidor (pestaña System / GPRS)", "2. Server (scheda System / GPRS)"),
        lines: [
          `Domain: ${SERVER_HOST} · Port: ${SERVER_PORT} · Protocol: TCP.`,
          bi("APN: vacío con Auto APN activo (igual que el FMC003).", "APN: vuoto con Auto APN attivo (come per il FMC003)."),
          "Codec: Codec 8 Extended.",
        ],
      },
      {
        title: bi("3. Datos que debe enviar (Data Acquisition y I/O)", "3. Dati che deve inviare (Data Acquisition e I/O)"),
        lines: [
          bi("Detenido: guardar y enviar cada 300 s. En movimiento: guardar cada 5 s y enviar cada 30 s.", "Fermo: salvare e inviare ogni 300 s. In movimento: salvare ogni 5 s e inviare ogni 30 s."),
          bi("Ignition Source: DIN1 (ignición por cable). Si el vehículo no entrega señal de contacto, usar Power Voltage.", "Ignition Source: DIN1 (accensione via cavo). Se il veicolo non fornisce il segnale di contatto, usare Power Voltage."),
          bi("I/O con envío activo: Ignition (239), Movement (240), GSM Signal (21), GNSS Status (69), External Voltage (66), Battery Voltage/Level (67/113), Digital Input 1 (1), Digital Output 1 (179), Total Odometer (16).", "I/O con invio attivo: Ignition (239), Movement (240), GSM Signal (21), GNSS Status (69), External Voltage (66), Battery Voltage/Level (67/113), Digital Input 1 (1), Digital Output 1 (179), Total Odometer (16)."),
          bi("Alarmas: Unplug (252), Jamming (249) y Crash (247). Towing solo cuando la ignición ya esté validada.", "Allarmi: Unplug (252), Jamming (249) e Crash (247). Towing solo quando l'accensione è già validata."),
        ],
      },
      {
        title: bi("4. Bloqueo del encendido (opcional)", "4. Blocco dell'avviamento (facoltativo)"),
        lines: [
          bi("DOUT1 (blanco) alimenta la bobina de un relé; el relé interrumpe el arranque o la bomba de combustible (contacto normalmente cerrado).", "DOUT1 (bianco) alimenta la bobina di un relè; il relè interrompe l'avviamento o la pompa del carburante (contatto normalmente chiuso)."),
          bi("Con el relé ya instalado, el botón “Bloquear” de esta ficha envía setdigout 1 y “Desbloquear” envía setdigout 0.", "Con il relè già installato, il pulsante “Blocca” di questa scheda invia setdigout 1 e “Sblocca” invia setdigout 0."),
          bi("Si el equipo pierde la alimentación, el relé se suelta y el vehículo vuelve a arrancar: es el comportamiento esperado.", "Se l'apparecchio perde l'alimentazione, il relè si rilascia e il veicolo torna a poter partire: è il comportamento previsto."),
        ],
      },
      {
        title: bi("5. Conducción (acelerómetro)", "5. Guida (accelerometro)"),
        lines: [
          bi("Se activa desde esta ficha, en la sección “Conducción”: no hace falta tocar el Configurator.", "Si attiva da questa scheda, nella sezione “Guida”: non serve toccare il Configurator."),
          bi("Para que mida bien, el equipo debe ir fijo, nivelado y con los cables hacia la parte delantera del vehículo.", "Per misurare bene, l'apparecchio deve essere fisso, livellato e con i cavi verso la parte anteriore del veicolo."),
        ],
      },
    ],
  },
  FTC880: {
    summary: bi("Tracker cableado LTE Cat 1 con batería interna y acelerómetro. Solo dos cables (alimentación y masa); sin Bluetooth, sin OBD y sin entradas.", "Tracker cablato LTE Cat 1 con batteria interna e accelerometro. Solo due cavi (alimentazione e massa); senza Bluetooth, senza OBD e senza ingressi."),
    obd: false,
    io: [],
    output: null,
    ignitionWire: false,
    setup: [
      {
        title: bi("1. Instalación (según la etiqueta del equipo)", "1. Installazione (secondo l'etichetta dell'apparecchio)"),
        lines: [
          bi("Rojo: +10…30 V (siempre vivo, con fusible).", "Rosso: +10…30 V (sempre sotto tensione, con fusibile)."),
          bi("Negro: GND (masa del vehículo).", "Nero: GND (massa del veicolo)."),
          bi("No tiene cable de contacto: la ignición se deduce por el acelerómetro o por el voltaje de la alimentación.", "Non ha il cavo di contatto: l'accensione si deduce dall'accelerometro o dalla tensione di alimentazione."),
          bi("Montarlo con la cara marcada “MOUNT THIS SIDE UP” hacia arriba y con vista al cielo.", "Montarlo con il lato contrassegnato “MOUNT THIS SIDE UP” rivolto verso l'alto e con vista sul cielo."),
          bi("SIM con datos (LTE Cat 1): insertarla con el equipo sin alimentación; con el equipo encendido puede no detectarse.", "SIM con dati (LTE Cat 1): inserirla con l'apparecchio non alimentato; con l'apparecchio acceso potrebbe non essere rilevata."),
        ],
      },
      {
        title: bi("2. Servidor (pestaña System / GPRS)", "2. Server (scheda System / GPRS)"),
        lines: [
          `Domain: ${SERVER_HOST} · Port: ${SERVER_PORT} · Protocol: TCP.`,
          bi("APN: vacío con Auto APN activo (igual que el FMC003).", "APN: vuoto con Auto APN attivo (come per il FMC003)."),
          "Codec: Codec 8 Extended.",
        ],
      },
      {
        title: bi("3. Datos que debe enviar (Data Acquisition y I/O)", "3. Dati che deve inviare (Data Acquisition e I/O)"),
        lines: [
          bi("Detenido: guardar y enviar cada 300 s. En movimiento: guardar cada 5 s y enviar cada 30 s.", "Fermo: salvare e inviare ogni 300 s. In movimento: salvare ogni 5 s e inviare ogni 30 s."),
          bi("Ignition Source: External Power Voltage (motor encendido cuando la batería sube por el alternador) o Accelerometer; son las dos que ofrece este modelo.", "Ignition Source: External Power Voltage (motore acceso quando la batteria sale per l'alternatore) oppure Accelerometer; sono le due che offre questo modello."),
          bi("I/O con envío activo: Ignition (239), Movement (240), GSM Signal (21), GNSS Status (69), External Voltage (66), Battery Voltage/Level (67/113).", "I/O con invio attivo: Ignition (239), Movement (240), GSM Signal (21), GNSS Status (69), External Voltage (66), Battery Voltage/Level (67/113)."),
          bi("Alarmas: Unplug (252), Jamming (249) y Crash (247).", "Allarmi: Unplug (252), Jamming (249) e Crash (247)."),
          bi("No lee el cuentakilómetros del vehículo: los km se cuentan por GPS.", "Non legge il contachilometri del veicolo: i km si contano via GPS."),
        ],
      },
    ],
  },
  FMB920: {
    summary: bi("Tracker cableado con Bluetooth, 1 entrada digital, 1 analógica y 1 salida. Sin OBD.", "Tracker cablato con Bluetooth, 1 ingresso digitale, 1 analogico e 1 uscita. Senza OBD."),
    obd: false,
    io: [
      { id: 1, label: bi("DIN1 · ignición", "DIN1 · accensione") },
      { id: 9, label: bi("AIN1 · entrada analógica", "AIN1 · ingresso analogico") },
    ],
    output: { id: 179, label: bi("DOUT1 · salida", "DOUT1 · uscita") },
    ignitionWire: true,
    setup: [],
  },
});

export function modelProfile(model: string): ModelProfile {
  return profiles()[model] ?? generic();
}

/** True when this model has a recipe worth showing in its sheet. */
export function hasSetupGuide(model: string): boolean {
  return modelProfile(model).setup.length > 0;
}

/** True when the model has its own profile (so what it lists, such as OBD, is known rather than assumed). */
export function hasProfile(model: string): boolean {
  return model in profiles();
}
