import { createContext, useContext, useEffect } from "react";

/**
 * Pages that fill the screen with a map (Mappa, a vehicle's Storico) say so to the app's frame: there only a strip of the backdrop shows
 * above the map, so the frame draws it as plain starry space instead of the Earth (whose top would show cut off by the map), and holds
 * it still, since nothing else of it is seen.
 */
export const MapBackdropContext = createContext<(overMap: boolean) => void>(() => {});

export function useMapBackdrop() {
  const setOverMap = useContext(MapBackdropContext);
  useEffect(() => {
    setOverMap(true);
    return () => setOverMap(false);
  }, [setOverMap]);
}
