import type { Translate } from "../i18n";
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
const ALARMS = {
  unplug_change: { avlId: 252, raised: "event.unplugRaised", cleared: "event.unplugCleared" },
  jamming_change: { avlId: 249, raised: "event.jammingRaised", cleared: "event.jammingCleared" },
  towing_change: { avlId: 246, raised: "event.towingRaised", cleared: "event.towingCleared" },
  crash_change: { avlId: 247, raised: "event.crashRaised", cleared: "event.crashCleared" },
} as const;

export function describeEvent(event: DeviceEvent, t: Translate): EventDescription {
  if (event.type === "ignition_change") {
    return value(event, 239) === 1
      ? { label: t("event.ignitionOn"), tone: "info" }
      : { label: t("event.ignitionOff"), tone: "info" };
  }
  if (event.type === "movement_change") {
    return { label: value(event, 240) === 1 ? t("event.started") : t("event.stopped"), tone: "info" };
  }
  if (event.type === "tracking_gap") {
    const minutes = Number(event.payload.minutes ?? 0);
    const duration = minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
    return { label: t("event.trackingGap", { duration }), tone: "alarm" };
  }
  const alarm = ALARMS[event.type as keyof typeof ALARMS];
  if (alarm) {
    return value(event, alarm.avlId) !== 0
      ? { label: t(alarm.raised), tone: "alarm" }
      : { label: t(alarm.cleared), tone: "clear" };
  }
  return { label: event.type, tone: "info" };
}
