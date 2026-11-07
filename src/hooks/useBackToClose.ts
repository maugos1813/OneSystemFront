import { useEffect, useRef } from "react";

/** The "pop" our own step back causes arrives a moment later; an overlay opened in that moment must not take it for a real Back. */
let ignorePopsUntil = 0;

/**
 * Lets the phone's Back button (and the browser's) close something that opens over the page — a list, a panel — instead of leaving
 * the page. While it is open it holds one history entry of its own: Back pops that entry and closes it. If it is closed some other
 * way (a tap, choosing something), the entry is dropped again so Back doesn't need an extra press later.
 */
export function useBackToClose(open: boolean, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    const id = `overlay-${Math.random().toString(36).slice(2)}`;
    // The router's own bookkeeping in the state is kept, so it sees the same place and nothing navigates.
    window.history.pushState({ ...(window.history.state ?? {}), __overlay: id }, "");
    let closedByBack = false;

    const onPop = () => {
      if (Date.now() < ignorePopsUntil) return;
      closedByBack = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      if (!closedByBack && window.history.state?.__overlay === id) {
        // Our entry is still the current one: step back over it without closing anything twice.
        ignorePopsUntil = Date.now() + 300;
        window.history.back();
      }
    };
  }, [open]);
}
