import { useEffect, useRef, useState } from "react";
import type { Position } from "../lib/types";

const ANIMATION_DURATION_MS = 4000;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Signed shortest turn from one compass heading to another, e.g. 350° -> 10° is +20°,
 * not -340° — without this a marker spinning past north would visibly whip around. */
function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

export interface SmoothedPosition {
  lat: number;
  lng: number;
  angle: number;
  speed: number;
}

/**
 * Eases lat/lng/angle/speed smoothly toward each new position update instead of
 * snapping to it — makes the map marker glide and the speed readout tween, so a device
 * reporting every 30-60s still *looks* continuously live instead of jumping in steps.
 * Never shows a position the device didn't actually report; it just doesn't jump there
 * instantly.
 */
export function useSmoothedPosition(target: Position | null | undefined): SmoothedPosition | null {
  const [display, setDisplay] = useState<SmoothedPosition | null>(
    target ? { lat: target.lat, lng: target.lng, angle: target.angle, speed: target.speed } : null,
  );
  const frameRef = useRef<number | null>(null);
  const fromRef = useRef<SmoothedPosition | null>(null);
  const startRef = useRef(0);
  const displayRef = useRef(display);
  displayRef.current = display;

  useEffect(() => {
    if (!target) return;
    const to: SmoothedPosition = { lat: target.lat, lng: target.lng, angle: target.angle, speed: target.speed };

    // First-ever position for this vehicle: nothing to animate from, show it as-is.
    if (!fromRef.current) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }

    // Animate onward from wherever it's currently displayed (not the previous raw
    // point), so a fast update doesn't reset an in-flight glide.
    const from = displayRef.current ?? to;
    fromRef.current = from;
    startRef.current = performance.now();
    const angleDelta = shortestAngleDelta(from.angle, to.angle);

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const step = (now: number) => {
      const t = Math.min((now - startRef.current) / ANIMATION_DURATION_MS, 1);
      const eased = easeOutCubic(t);
      setDisplay({
        lat: from.lat + (to.lat - from.lat) * eased,
        lng: from.lng + (to.lng - from.lng) * eased,
        angle: from.angle + angleDelta * eased,
        speed: from.speed + (to.speed - from.speed) * eased,
      });
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only start a new glide when the raw target actually changes
  }, [target?.lat, target?.lng, target?.angle, target?.speed, target?.ts]);

  return display;
}
