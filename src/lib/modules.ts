import type { MessageKey } from "../i18n";

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

export const ADMIN_SECTION_INFO: Record<AdminSectionKey, { label: MessageKey; hint: MessageKey }> = {
  dispositivos: { label: "adminSection.dispositivos", hint: "adminSection.dispositivos.hint" },
  ajustes: { label: "adminSection.ajustes", hint: "adminSection.ajustes.hint" },
  api_keys: { label: "adminSection.api_keys", hint: "adminSection.api_keys.hint" },
};

/**
 * The sections of a list that this screen knows how to name and shows. The server can know a section the screen does not (Peajes has no
 * page here) and owner/admin come with all of the server's: those are left out instead of breaking the screen that lists them.
 */
export function visibleModules(keys: readonly string[]): ModuleKey[] {
  return keys.filter((key): key is ModuleKey => key in MODULE_INFO && !HIDDEN_MODULES.includes(key));
}

/** The name and one-line description of a section, as translation keys (show them with t()). */
export interface ModuleInfo {
  label: MessageKey;
  hint: MessageKey;
}

export const MODULE_INFO: Record<ModuleKey, ModuleInfo> = Object.fromEntries(
  MODULE_KEYS.map((key) => [key, { label: `module.${key}` as MessageKey, hint: `module.${key}.hint` as MessageKey }]),
) as Record<ModuleKey, ModuleInfo>;

/** Ready-made packages. Cockpit, Conducción and Vencimientos are in none of them. */
export const MODULE_TEMPLATES: Record<"basico" | "estandar" | "completo" | "recursosHumanos", readonly ModuleKey[]> = {
  basico: ["mapa", "historial", "alertas"],
  estandar: ["mapa", "historial", "alertas", "vehiculos", "geocercas"],
  completo: ["mapa", "historial", "alertas", "vehiculos", "geocercas", "mantenimiento"],
  // Recursos humanos: only the vehicles, to follow each one's tagliando (it needs the Manager role to enter them).
  recursosHumanos: ["vehiculos", "mantenimiento"],
};

export const TEMPLATE_LABEL: Record<keyof typeof MODULE_TEMPLATES, MessageKey> = {
  basico: "template.basico",
  estandar: "template.estandar",
  completo: "template.completo",
  recursosHumanos: "template.recursosHumanos",
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
