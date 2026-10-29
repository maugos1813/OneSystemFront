import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildTimeline, DEFAULT_PLAYBACK_RATE, interpolatePosition, locate } from "../lib/playback";
import type { Position } from "../lib/types";

const TICK_MS = 50;

/**
 * Plays a route back at a chosen multiple of real time (1x is as it happened, with long stops shortened). `position` is
 * where the vehicle is at that moment, interpolated between reports; `index` is the last report it has passed.
 * `resetKey` stops the playback and rewinds it when it changes (another vehicle or period).
 */
export function usePlayback(positions: Position[], resetKey: string) {
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<number>(DEFAULT_PLAYBACK_RATE);
  const [playhead, setPlayhead] = useState({ index: 0, frac: 0 });
  const timeline = useMemo(() => buildTimeline(positions), [positions]);
  const total = timeline.length > 0 ? timeline[timeline.length - 1]! : 0;
  const clock = useRef(0);

  const seek = useCallback(
    (index: number) => {
      const i = Math.max(0, Math.min(index, positions.length - 1));
      clock.current = timeline[i] ?? 0;
      setPlayhead({ index: i, frac: 0 });
    },
    [positions.length, timeline],
  );

  useEffect(() => {
    setPlaying(false);
    clock.current = 0;
    setPlayhead({ index: 0, frac: 0 });
  }, [resetKey]);

  useEffect(() => {
    if (!playing || positions.length < 2) return;
    if (clock.current >= total) clock.current = 0; // play again from the start once it has ended
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      clock.current = Math.min(total, clock.current + (now - last) * rate);
      last = now;
      setPlayhead(locate(timeline, clock.current));
      if (clock.current >= total) setPlaying(false);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [playing, rate, timeline, total, positions.length]);

  const position = useMemo(() => {
    const here = positions[playhead.index];
    return here ? interpolatePosition(here, positions[playhead.index + 1], playhead.frac) : null;
  }, [positions, playhead]);

  return {
    playing,
    togglePlay: () => setPlaying((p) => !p),
    stop: () => {
      setPlaying(false);
      seek(0);
    },
    rate,
    setRate,
    index: playhead.index,
    position,
    seek,
  };
}
