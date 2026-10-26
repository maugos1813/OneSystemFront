/** Models offered in the pickers. The tracker never reports its own model, so a person picks it. */
export const DEVICE_MODELS = ["FMB204", "FMC003", "FTC920", "FMB920", "FMC130", "FMC150", "Otro"] as const;

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

const GENERIC: ModelProfile = {
  summary: "Modelo sin perfil propio: se muestran todos los datos.",
  obd: true,
  io: [],
  output: null,
  ignitionWire: false,
  setup: [],
};

export const SERVER_HOST = "tramway.proxy.rlwy.net";
export const SERVER_PORT = "26090";

const PROFILES: Record<string, ModelProfile> = {
  FMC003: {
    summary: "Tracker OBD plug-and-play, LTE Cat 1, con Bluetooth.",
    obd: true,
    io: [],
    output: null,
    ignitionWire: false,
    setup: [],
  },
  FTC920: {
    summary: "Tracker cableado LTE Cat 1 con batería interna, 2 entradas y 1 salida para relé. No tiene puerto OBD.",
    obd: false,
    io: [
      { id: 1, label: "DIN1 · ignición (cable amarillo)" },
      { id: 2, label: "DIN2 (cable gris)" },
      { id: 9, label: "AIN1 · entrada analógica (cable gris)" },
    ],
    output: { id: 179, label: "DOUT1 · salida (cable blanco)" },
    ignitionWire: true,
    setup: [
      {
        title: "1. Instalación (según la etiqueta del equipo)",
        lines: [
          "Rojo: +10…30 V (siempre vivo, con fusible de 3 A).",
          "Negro: GND (masa del vehículo).",
          "Amarillo (DIN1): señal de contacto/ignición (+12 V solo con la llave en ON).",
          "Blanco (DOUT1): salida a colector abierto, máx. 0,5 A. Va a la bobina de un relé, nunca directo a la carga.",
          "Montarlo con la cara marcada “MOUNT THIS SIDE UP” hacia arriba.",
          "SIM con datos (LTE Cat 1): insertarla con el equipo sin alimentación; con el equipo encendido puede no detectarse.",
        ],
      },
      {
        title: "2. Servidor (pestaña System / GPRS)",
        lines: [
          `Domain: ${SERVER_HOST} · Port: ${SERVER_PORT} · Protocol: TCP.`,
          "APN: vacío con Auto APN activo (igual que el FMC003).",
          "Codec: Codec 8 Extended.",
        ],
      },
      {
        title: "3. Datos que debe enviar (Data Acquisition y I/O)",
        lines: [
          "Detenido: guardar y enviar cada 300 s. En movimiento: guardar cada 5 s y enviar cada 30 s.",
          "Ignition Source: DIN1 (ignición por cable). Si el vehículo no entrega señal de contacto, usar Power Voltage.",
          "I/O con envío activo: Ignition (239), Movement (240), GSM Signal (21), GNSS Status (69), External Voltage (66), Battery Voltage/Level (67/113), Digital Input 1 (1), Digital Output 1 (179), Total Odometer (16).",
          "Alarmas: Unplug (252), Jamming (249) y Crash (247). Towing solo cuando la ignición ya esté validada.",
        ],
      },
      {
        title: "4. Bloqueo del encendido (opcional)",
        lines: [
          "DOUT1 (blanco) alimenta la bobina de un relé; el relé interrumpe el arranque o la bomba de combustible (contacto normalmente cerrado).",
          "Con el relé ya instalado, el botón “Bloquear” de esta ficha envía setdigout 1 y “Desbloquear” envía setdigout 0.",
          "Si el equipo pierde la alimentación, el relé se suelta y el vehículo vuelve a arrancar: es el comportamiento esperado.",
        ],
      },
      {
        title: "5. Conducción (acelerómetro)",
        lines: [
          "Se activa desde esta ficha, en la sección “Conducción”: no hace falta tocar el Configurator.",
          "Para que mida bien, el equipo debe ir fijo, nivelado y con los cables hacia la parte delantera del vehículo.",
        ],
      },
    ],
  },
  FMB920: {
    summary: "Tracker cableado con Bluetooth, 1 entrada digital, 1 analógica y 1 salida. Sin OBD.",
    obd: false,
    io: [
      { id: 1, label: "DIN1 · ignición" },
      { id: 9, label: "AIN1 · entrada analógica" },
    ],
    output: { id: 179, label: "DOUT1 · salida" },
    ignitionWire: true,
    setup: [],
  },
};

export function modelProfile(model: string): ModelProfile {
  return PROFILES[model] ?? GENERIC;
}

/** True when this model has a recipe worth showing in its sheet. */
export function hasSetupGuide(model: string): boolean {
  return modelProfile(model).setup.length > 0;
}

/** True when the model has its own profile (so what it lists, such as OBD, is known rather than assumed). */
export function hasProfile(model: string): boolean {
  return model in PROFILES;
}
