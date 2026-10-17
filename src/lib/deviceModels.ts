/** Models offered in the pickers. The tracker never reports its own model, so a person picks it. */
export const DEVICE_MODELS = ["FMB204", "FMC003", "FMB920", "FMC130", "FMC150", "Otro"] as const;

/** The picker options for a device, keeping a model that isn't in the list (legacy rows). */
export function modelOptions(current: string): string[] {
  return DEVICE_MODELS.includes(current as (typeof DEVICE_MODELS)[number]) ? [...DEVICE_MODELS] : [current, ...DEVICE_MODELS];
}
