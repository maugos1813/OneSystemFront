import type { MouseEvent } from "react";

export function trackGlow(e: MouseEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--glow-x", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--glow-y", `${e.clientY - rect.top}px`);
}
