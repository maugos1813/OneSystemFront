/**
 * Names and units for the Teltonika AVL IDs we know about, so the device sheet can show
 * "Voltaje externo · 13,9 V" instead of "66 · 13900". Anything not listed is shown as
 * "ID n" with its raw value — the point of that list is to reveal what a device sends.
 * Reference: https://wiki.teltonika-gps.com/view/Teltonika_Data_Sending_Parameters_ID
 */

interface IoDef {
  name: string;
  format?: (value: number | string) => string;
}

const num = (value: number | string) => Number(value);
const fmt = (value: number, digits = 1) => value.toLocaleString("es-AR", { maximumFractionDigits: digits });
const onOff = (on: string, off: string) => (value: number | string) => (num(value) === 1 ? on : off);
const mvToVolts = (value: number | string) => `${fmt(num(value) / 1000, 2)} V`;
const withUnit = (unit: string, digits = 0) => (value: number | string) => `${fmt(num(value), digits)} ${unit}`;

const GNSS_STATUS: Record<number, string> = { 0: "GNSS apagado", 1: "Con fix", 2: "Sin fix (buscando satélites)", 3: "En reposo (sleep)" };
const SLEEP_MODE: Record<number, string> = { 0: "Sin sueño", 1: "Sueño de GPS", 2: "Sueño profundo", 3: "Sueño en línea", 4: "Sueño ultra" };

const DEFINITIONS: Record<number, IoDef> = {
  1: { name: "Entrada digital 1", format: onOff("Activa", "Inactiva") },
  11: { name: "ICCID de la SIM" },
  12: { name: "Combustible usado (GPS)" },
  13: { name: "Consumo de combustible (GPS)" },
  15: { name: "Eco Score" },
  16: { name: "Odómetro total", format: (v) => `${fmt(num(v) / 1000, 1)} km` },
  21: { name: "Señal GSM", format: (v) => `${num(v)} de 5` },
  24: { name: "Velocidad (GNSS)", format: withUnit("km/h") },
  30: { name: "Cantidad de códigos de falla (DTC)" },
  31: { name: "Carga del motor", format: withUnit("%") },
  32: { name: "Temperatura del motor", format: withUnit("°C") },
  36: { name: "RPM del motor", format: withUnit("rpm") },
  37: { name: "Velocidad del vehículo (OBD)", format: withUnit("km/h") },
  41: { name: "Posición del acelerador", format: withUnit("%") },
  48: { name: "Nivel de combustible", format: withUnit("%") },
  60: { name: "Consumo de combustible (OBD)", format: (v) => `${fmt(num(v) / 100, 2)} L/h` },
  66: { name: "Voltaje externo (vehículo)", format: mvToVolts },
  67: { name: "Batería interna", format: mvToVolts },
  68: { name: "Corriente de la batería", format: withUnit("mA") },
  69: { name: "Estado del GNSS", format: (v) => GNSS_STATUS[num(v)] ?? String(v) },
  113: { name: "Nivel de batería interna", format: withUnit("%") },
  181: { name: "PDOP", format: (v) => fmt(num(v) / 10, 1) },
  182: { name: "HDOP", format: (v) => fmt(num(v) / 10, 1) },
  199: { name: "Odómetro del viaje", format: (v) => `${fmt(num(v) / 1000, 1)} km` },
  200: { name: "Modo de sueño", format: (v) => SLEEP_MODE[num(v)] ?? String(v) },
  205: { name: "Cell ID (GSM)" },
  206: { name: "Código de área (GSM)" },
  237: { name: "Tipo de red" },
  239: { name: "Ignición", format: onOff("Encendida", "Apagada") },
  240: { name: "Movimiento", format: onOff("En movimiento", "Detenido") },
  241: { name: "Operador GSM activo", format: (v) => { const code = String(v); return code.length > 3 ? `${code.slice(0, 3)}-${code.slice(3)}` : code; } },
  246: { name: "Remolque", format: onOff("Remolcando", "Normal") },
  247: { name: "Detección de choque" },
  249: { name: "Jamming (interferencia)", format: onOff("Detectado", "Normal") },
  250: { name: "Viaje" },
  251: { name: "Ralentí", format: onOff("En ralentí", "No") },
  252: { name: "Equipo desconectado (unplug)", format: onOff("Desconectado", "Conectado") },
  253: { name: "Tipo de conducción agresiva" },
  254: { name: "Intensidad de conducción agresiva" },
  255: { name: "Exceso de velocidad", format: withUnit("km/h") },
  256: { name: "VIN del vehículo" },
  281: { name: "Códigos de falla (DTC)" },
  303: { name: "Movimiento instantáneo", format: onOff("En movimiento", "Detenido") },
  389: { name: "Kilometraje OEM (OBD)", format: withUnit("km") },
  390: { name: "Nivel de combustible OEM", format: (v) => `${fmt(num(v) / 10, 1)} L` },
};

export interface IoDescription {
  name: string;
  display: string;
  known: boolean;
}

export function describeIo(id: number, value: number | string): IoDescription {
  const def = DEFINITIONS[id];
  if (!def) return { name: `ID ${id}`, display: String(value), known: false };
  return { name: def.name, display: def.format ? def.format(value) : String(value), known: true };
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
