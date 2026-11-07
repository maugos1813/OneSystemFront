import { useCallback, useEffect, useState } from "react";
import { useBackToClose } from "./useBackToClose";

/**
 * A map "in full screen" that is the page's own, not the browser's: the Fullscreen API does nothing on an iPhone and is not available
 * inside the Android app's web view, so the button that relied on it was dead on a phone. This only says whether the map should cover
 * the whole screen; the page lays it out so. Back and Escape bring it down, and the page behind does not scroll meanwhile.
 */
export function useInAppFullscreen(): [boolean, () => void] {
  const [full, setFull] = useState(false);
  useBackToClose(full, () => setFull(false));

  useEffect(() => {
    if (!full) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setFull(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [full]);

  return [full, useCallback(() => setFull((current) => !current), [])];
}
