/**
 * Names and units for the Teltonika AVL IDs we know about, so the device sheet can show
 * "Voltaje externo · 13,9 V" instead of "66 · 13900". Anything not listed is shown as
 * "ID n" with its raw value — the point of that list is to reveal what a device sends.
 * Reference: https://wiki.teltonika-gps.com/view/Teltonika_Data_Sending_Parameters_ID
 */

import { bi, currentLocale } from "../i18n";

/** A name in both languages: [Spanish, Italian]. */
type Bi = readonly [string, string];

interface IoDef {
  name: Bi;
  format?: (value: number | string) => string;
}

const num = (value: number | string) => Number(value);
const fmt = (value: number, digits = 1) => value.toLocaleString(currentLocale(), { maximumFractionDigits: digits });
const onOff = (on: Bi, off: Bi) => (value: number | string) => (num(value) === 1 ? bi(...on) : bi(...off));
const mvToVolts = (value: number | string) => `${fmt(num(value) / 1000, 2)} V`;
const withUnit = (unit: string, digits = 0) => (value: number | string) => `${fmt(num(value), digits)} ${unit}`;

/** Variable-length elements (VIN, fault codes) arrive as hex text; show the ASCII they carry. */
function hexToText(value: number | string): string {
  const hex = String(value);
  if (!/^([0-9a-fA-F]{2})+$/.test(hex)) return hex;
  const text = hex.match(/../g)!.map((pair) => String.fromCharCode(parseInt(pair, 16))).join("");
  return /^[\x20-\x7e]+$/.test(text) ? text : hex;
}

const GNSS_STATUS: Record<number, Bi> = {
  0: ["GNSS apagado", "GNSS spento"],
  1: ["Con fix", "Con fix"],
  2: ["Sin fix (buscando satélites)", "Senza fix (ricerca satelliti)"],
  3: ["En reposo (sleep)", "A riposo (sleep)"],
};
const SLEEP_MODE: Record<number, Bi> = {
  0: ["Sin sueño", "Nessun sleep"],
  1: ["Sueño de GPS", "Sleep del GPS"],
  2: ["Sueño profundo", "Sleep profondo"],
  3: ["Sueño en línea", "Sleep online"],
  4: ["Sueño ultra", "Sleep ultra"],
};
const ACTIVE: Bi = ["Activa", "Attiva"];
const INACTIVE: Bi = ["Inactiva", "Inattiva"];
const ACTIVATED: Bi = ["Activada", "Attivata"];
const DEACTIVATED: Bi = ["Desactivada", "Disattivata"];
const MOVING: Bi = ["En movimiento", "In movimento"];
const STOPPED: Bi = ["Detenido", "Fermo"];

const DEFINITIONS: Record<number, IoDef> = {
  1: { name: ["Entrada digital 1", "Ingresso digitale 1"], format: onOff(ACTIVE, INACTIVE) },
  2: { name: ["Entrada digital 2", "Ingresso digitale 2"], format: onOff(ACTIVE, INACTIVE) },
  9: { name: ["Entrada analógica 1", "Ingresso analogico 1"], format: mvToVolts },
  11: { name: ["ICCID de la SIM", "ICCID della SIM"] },
  12: { name: ["Combustible usado (GPS)", "Carburante usato (GPS)"] },
  13: { name: ["Consumo de combustible (GPS)", "Consumo di carburante (GPS)"] },
  15: { name: ["Eco Score", "Eco Score"] },
  16: { name: ["Odómetro total", "Contachilometri totale"], format: (v) => `${fmt(num(v) / 1000, 1)} km` },
  21: { name: ["Señal GSM", "Segnale GSM"], format: (v) => `${num(v)} ${bi("de", "su")} 5` },
  24: { name: ["Velocidad (GNSS)", "Velocità (GNSS)"], format: withUnit("km/h") },
  30: { name: ["Cantidad de códigos de falla (DTC)", "Numero di codici di guasto (DTC)"] },
  31: { name: ["Carga del motor", "Carico del motore"], format: withUnit("%") },
  32: { name: ["Temperatura del motor", "Temperatura del motore"], format: withUnit("°C") },
  36: { name: ["RPM del motor", "Giri del motore"], format: withUnit("rpm") },
  37: { name: ["Velocidad del vehículo (OBD)", "Velocità del veicolo (OBD)"], format: withUnit("km/h") },
  41: { name: ["Posición del acelerador", "Posizione dell'acceleratore"], format: withUnit("%") },
  48: { name: ["Nivel de combustible", "Livello del carburante"], format: withUnit("%") },
  60: { name: ["Consumo de combustible (OBD)", "Consumo di carburante (OBD)"], format: (v) => `${fmt(num(v) / 100, 2)} L/h` },
  66: { name: ["Voltaje externo (vehículo)", "Tensione esterna (veicolo)"], format: mvToVolts },
  67: { name: ["Batería interna", "Batteria interna"], format: mvToVolts },
  68: { name: ["Corriente de la batería", "Corrente della batteria"], format: withUnit("mA") },
  69: { name: ["Estado del GNSS", "Stato del GNSS"], format: (v) => (GNSS_STATUS[num(v)] ? bi(...GNSS_STATUS[num(v)]!) : String(v)) },
  113: { name: ["Nivel de batería interna", "Livello della batteria interna"], format: withUnit("%") },
  179: { name: ["Salida digital 1 (DOUT1)", "Uscita digitale 1 (DOUT1)"], format: onOff(ACTIVATED, DEACTIVATED) },
  181: { name: ["PDOP", "PDOP"], format: (v) => fmt(num(v) / 10, 1) },
  182: { name: ["HDOP", "HDOP"], format: (v) => fmt(num(v) / 10, 1) },
  199: { name: ["Odómetro del viaje", "Contachilometri del viaggio"], format: (v) => `${fmt(num(v) / 1000, 1)} km` },
  200: { name: ["Modo de sueño", "Modalità sleep"], format: (v) => (SLEEP_MODE[num(v)] ? bi(...SLEEP_MODE[num(v)]!) : String(v)) },
  205: { name: ["Cell ID (GSM)", "Cell ID (GSM)"] },
  206: { name: ["Código de área (GSM)", "Codice di area (GSM)"] },
  237: { name: ["Tipo de red", "Tipo di rete"] },
  239: { name: ["Ignición", "Accensione"], format: onOff(["Encendida", "Accesa"], ["Apagada", "Spenta"]) },
  240: { name: ["Movimiento", "Movimento"], format: onOff(MOVING, STOPPED) },
  241: { name: ["Operador GSM activo", "Operatore GSM attivo"], format: (v) => { const code = String(v); return code.length > 3 ? `${code.slice(0, 3)}-${code.slice(3)}` : code; } },
  246: { name: ["Remolque", "Traino"], format: onOff(["Remolcando", "In traino"], ["Normal", "Normale"]) },
  247: { name: ["Detección de choque", "Rilevamento urto"] },
  249: { name: ["Jamming (interferencia)", "Jamming (interferenza)"], format: onOff(["Detectado", "Rilevato"], ["Normal", "Normale"]) },
  250: { name: ["Viaje", "Viaggio"] },
  251: { name: ["Ralentí", "Minimo"], format: onOff(["En ralentí", "Al minimo"], ["No", "No"]) },
  252: { name: ["Equipo desconectado (unplug)", "Apparecchio scollegato (unplug)"], format: onOff(["Desconectado", "Scollegato"], ["Conectado", "Collegato"]) },
  253: { name: ["Tipo de conducción agresiva", "Tipo di guida aggressiva"] },
  254: { name: ["Intensidad de conducción agresiva", "Intensità della guida aggressiva"] },
  255: { name: ["Exceso de velocidad", "Eccesso di velocità"], format: withUnit("km/h") },
  256: { name: ["VIN del vehículo", "VIN del veicolo"], format: hexToText },
  281: { name: ["Códigos de falla (DTC)", "Codici di guasto (DTC)"], format: hexToText },
  303: { name: ["Movimiento instantáneo", "Movimento istantaneo"], format: onOff(MOVING, STOPPED) },
  389: { name: ["Kilometraje OEM (OBD)", "Chilometraggio OEM (OBD)"], format: withUnit("km") },
  390: { name: ["Nivel de combustible OEM", "Livello carburante OEM"], format: (v) => `${fmt(num(v) / 10, 1)} L` },
};

export interface IoDescription {
  name: string;
  display: string;
  known: boolean;
}

export function describeIo(id: number, value: number | string): IoDescription {
  const def = DEFINITIONS[id];
  if (!def) return { name: `ID ${id}`, display: String(value), known: false };
  return { name: bi(...def.name), display: def.format ? def.format(value) : String(value), known: true };
}

/** IDs that only show up when the OBD side of the tracker is configured and reading the car. */
export const OBD_IO_IDS: ReadonlySet<number> = new Set([
  ...Array.from({ length: 31 }, (_, i) => 30 + i), // 30–60: standard OBD II parameters
  256, // VIN
  281, // fault codes
  389, // OBD OEM total mileage
  390, // OBD OEM fuel level
  402,
  410,
  412,
  540,
  541,
  542,
]);
