/**
 * The OneTrack sections an admin gives a client. Mirrors the server's catalog (services/modules.ts there):
 * the server is what enforces them, this is what the menu and the admin screen show.
 */
export const MODULE_KEYS = [
  "mapa",
  "historial",
  "alertas",
  "analiticas",
  "vehiculos",
  "geocercas",
  "mantenimiento",
  "cockpit",
  "conduccion",
  "peajes",
  "vencimientos",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export interface ModuleInfo {
  label: string;
  hint: string;
}

export const MODULE_INFO: Record<ModuleKey, ModuleInfo> = {
  mapa: { label: "Mapa", hint: "Seguimiento en vivo de sus vehículos" },
  historial: { label: "Historial", hint: "Recorridos de días anteriores" },
  alertas: { label: "Alertas", hint: "Avisos de su flota" },
  analiticas: { label: "Analíticas", hint: "Informes y tendencias" },
  vehiculos: { label: "Vehículos", hint: "Lista de sus unidades" },
  geocercas: { label: "Geocercas", hint: "Zonas y avisos de entrada y salida" },
  mantenimiento: { label: "Mantenimiento", hint: "Planes y servicios por kilometraje" },
  cockpit: { label: "Cockpit", hint: "Panel del vehículo con fuerzas G y puntuación de conducción" },
  conduccion: { label: "Conducción", hint: "Comportamiento de los choferes (sensible)" },
  peajes: { label: "Peajes", hint: "Pasajes por peaje y su costo (son costos tuyos)" },
  vencimientos: { label: "Vencimientos", hint: "Seguro, revisión, bollo y tacógrafo de sus propios vehículos, con avisos" },
};

/** Ready-made packages. Cockpit, Conducción, Peajes and Vencimientos are in none of them. */
export const MODULE_TEMPLATES: Record<"basico" | "estandar" | "completo", readonly ModuleKey[]> = {
  basico: ["mapa", "historial", "alertas"],
  estandar: ["mapa", "historial", "alertas", "analiticas", "vehiculos", "geocercas"],
  completo: ["mapa", "historial", "alertas", "analiticas", "vehiculos", "geocercas", "mantenimiento"],
};

export const TEMPLATE_LABEL: Record<keyof typeof MODULE_TEMPLATES, string> = {
  basico: "Básico",
  estandar: "Estándar",
  completo: "Completo",
};

/** Which template a selection is exactly, or null when it is a custom mix. */
export function matchingTemplate(selected: readonly string[]): keyof typeof MODULE_TEMPLATES | null {
  const names = Object.keys(MODULE_TEMPLATES) as Array<keyof typeof MODULE_TEMPLATES>;
  return (
    names.find((name) => {
      const template = MODULE_TEMPLATES[name];
      return template.length === selected.length && template.every((key) => selected.includes(key));
    }) ?? null
  );
}
