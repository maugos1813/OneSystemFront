/**
 * The cursor as a light source: every component with the fine metallic rim (see "metal edge" in index.css) is told where the pointer is,
 * relative to itself, so the silver catches the light on the side facing it and the shine slides along the rim as the pointer moves —
 * even over other components. One listener for the whole page, at most one update per frame, and only for what is on screen.
 */

/** What gets the rim. Keep in step with the selectors of the metal edge in index.css. */
export const METAL_SELECTOR = ".glass, .glass-bubble, .nav-pill-active, main .rounded-2xl.bg-white, main .rounded-3xl.bg-white";

export function startMetalLight(): void {
  // A phone or tablet has no pointer hovering over the page: the rim stays as plain brushed silver there.
  if (typeof window === "undefined" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  let pointer: { x: number; y: number } | null = null;
  let frame = 0;

  const paint = () => {
    frame = 0;
    if (!pointer) return;
    const { innerWidth, innerHeight } = window;
    for (const element of document.querySelectorAll<HTMLElement>(METAL_SELECTOR)) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth || rect.width === 0) continue;
      element.style.setProperty("--lx", `${Math.round(pointer.x - rect.left)}px`);
      element.style.setProperty("--ly", `${Math.round(pointer.y - rect.top)}px`);
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(paint);
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    },
    { passive: true },
  );
  // Scrolling moves the components under a still pointer, and a new page brings new ones: both need the light worked out again.
  window.addEventListener("scroll", schedule, { passive: true, capture: true });
  window.addEventListener("resize", schedule, { passive: true });
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  // The pointer left the window: the light goes out instead of staying stuck where it was.
  document.documentElement.addEventListener("pointerleave", () => {
    pointer = null;
    for (const element of document.querySelectorAll<HTMLElement>(METAL_SELECTOR)) {
      element.style.removeProperty("--lx");
      element.style.removeProperty("--ly");
    }
  });
}
