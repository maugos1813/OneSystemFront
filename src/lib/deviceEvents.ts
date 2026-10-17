import type { DeviceEvent } from "./types";

export type EventTone = "info" | "alarm" | "clear";

export interface EventDescription {
  label: string;
  /** "alarm" is a raised tracker alarm; "clear" is the same alarm ending; "info" is routine. */
  tone: EventTone;
}

function value(event: DeviceEvent, avlId: number): number {
  return Number(event.payload[String(avlId)] ?? 0);
}

/** How an alarm event reads: its label when raised and when it clears. */
const ALARMS: Record<string, { avlId: number; raised: string; cleared: string }> = {
  unplug_change: { avlId: 252, raised: "Dispositivo desconectado del vehículo", cleared: "Dispositivo reconectado" },
  jamming_change: { avlId: 249, raised: "Interferencia de señal (jamming)", cleared: "Interferencia terminada" },
  towing_change: { avlId: 246, raised: "Posible remolque", cleared: "Remolque terminado" },
  crash_change: { avlId: 247, raised: "Posible choque o impacto", cleared: "Alarma de choque terminada" },
};

export function describeEvent(event: DeviceEvent): EventDescription {
  if (event.type === "ignition_change") {
    return value(event, 239) === 1
      ? { label: "Ignición encendida", tone: "info" }
      : { label: "Ignición apagada", tone: "info" };
  }
  if (event.type === "movement_change") {
    return { label: value(event, 240) === 1 ? "Empezó a moverse" : "Se detuvo", tone: "info" };
  }
  const alarm = ALARMS[event.type];
  if (alarm) {
    return value(event, alarm.avlId) !== 0
      ? { label: alarm.raised, tone: "alarm" }
      : { label: alarm.cleared, tone: "clear" };
  }
  return { label: event.type, tone: "info" };
}
