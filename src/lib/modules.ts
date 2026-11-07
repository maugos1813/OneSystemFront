/**
 * The OneTrack sections an admin gives a client. Mirrors the server's catalog (services/modules.ts there):
 * the server is what enforces them, this is what the menu and the admin screen show.
 */
export const MODULE_KEYS = [
  "mapa",
  "historial",
  "alertas",
  "vehiculos",
  "geocercas",
  "mantenimiento",
  "cockpit",
  "conduccion",
  "vencimientos",
] as const;

/** Sections that still exist in the system but are not offered any more (Cockpit and Vencimientos are hidden). */
export const HIDDEN_MODULES: readonly string[] = ["cockpit", "vencimientos"];

export type ModuleKey = (typeof MODULE_KEYS)[number];

/** The administration pages of a client's own account that OneSystec can also leave out for it. */
export const ADMIN_SECTION_KEYS = ["dispositivos", "ajustes", "api_keys"] as const;
export type AdminSectionKey = (typeof ADMIN_SECTION_KEYS)[number];

export const ADMIN_SECTION_INFO: Record<AdminSectionKey, { label: string; hint: string }> = {
  dispositivos: { label: "Dispositivos", hint: "Sus dispositivos, su salud y las balizas EYE BEACON" },
  ajustes: { label: "Ajustes de OneTrack", hint: "Horarios y umbrales de las alertas" },
  api_keys: { label: "API Keys", hint: "Claves para integrar OneTrack con otros sistemas" },
};

export interface ModuleInfo {
  label: string;
  hint: string;
}

export const MODULE_INFO: Record<ModuleKey, ModuleInfo> = {
  mapa: { label: "Mapa", hint: "Seguimiento en vivo de sus vehículos" },
  historial: { label: "Historial", hint: "Recorridos de días anteriores" },
  alertas: { label: "Alertas", hint: "Avisos de su flota" },
  vehiculos: { label: "Vehículos", hint: "Lista de sus unidades" },
  geocercas: { label: "Geocercas", hint: "Zonas y avisos de entrada y salida" },
  mantenimiento: { label: "Mantenimiento", hint: "Planes y servicios por kilometraje" },
  cockpit: { label: "Cockpit", hint: "Panel del vehículo con fuerzas G y puntuación de conducción" },
  conduccion: { label: "Conducción", hint: "Comportamiento de los choferes (sensible)" },
  vencimientos: { label: "Vencimientos", hint: "Seguro, revisión, bollo y tacógrafo de sus propios vehículos, con avisos" },
};

/** Ready-made packages. Cockpit, Conducción and Vencimientos are in none of them. */
export const MODULE_TEMPLATES: Record<"basico" | "estandar" | "completo" | "recursosHumanos", readonly ModuleKey[]> = {
  basico: ["mapa", "historial", "alertas"],
  estandar: ["mapa", "historial", "alertas", "vehiculos", "geocercas"],
  completo: ["mapa", "historial", "alertas", "vehiculos", "geocercas", "mantenimiento"],
  // Recursos humanos: only the vehicles, to follow each one's tagliando (it needs the Manager role to enter them).
  recursosHumanos: ["vehiculos", "mantenimiento"],
};

export const TEMPLATE_LABEL: Record<keyof typeof MODULE_TEMPLATES, string> = {
  basico: "Básico",
  estandar: "Estándar",
  completo: "Completo",
  recursosHumanos: "Recursos humanos",
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
