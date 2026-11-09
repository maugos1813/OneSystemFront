import { createLucideIcon } from "lucide-react";

/** A GPS tracker (a Teltonika-style box) with its harness wires coming out of the right side: Lucide has no icon of one. */
export const TrackerIcon = createLucideIcon("Tracker", [
  ["rect", { x: "2", y: "7", width: "12", height: "10", rx: "2", key: "body" }],
  ["path", { d: "M14 9h4a2 2 0 0 0 2-2V5", key: "wire-top" }],
  ["path", { d: "M14 12h8", key: "wire-mid" }],
  ["path", { d: "M14 15h4a2 2 0 0 1 2 2v2", key: "wire-bottom" }],
  ["path", { d: "M5.9 12h.2", key: "led" }],
  ["path", { d: "M9 12h2", key: "slot" }],
]);
