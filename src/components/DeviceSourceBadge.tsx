import type { DeviceSource } from "../lib/types";

const LABEL: Record<DeviceSource, string> = {
  teltonika: "Teltonika",
  radius_velocity: "Radius Velocity",
};

const STYLE: Record<DeviceSource, string> = {
  teltonika: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  radius_velocity: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
};

export function DeviceSourceBadge({ source }: { source: DeviceSource }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[source]}`}>
      {LABEL[source]}
    </span>
  );
}
