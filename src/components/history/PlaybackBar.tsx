import { Pause, Play, Square } from "lucide-react";

interface PlaybackBarProps {
  playing: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  currentIndex: number;
  total: number;
  onSeek: (index: number) => void;
  currentSpeed: number;
  speedLimit: number;
  onSpeedLimitChange: (limit: number) => void;
  currentTs: string | null;
}

export function PlaybackBar({
  playing,
  onTogglePlay,
  onStop,
  currentIndex,
  total,
  onSeek,
  currentSpeed,
  speedLimit,
  onSpeedLimitChange,
  currentTs,
}: PlaybackBarProps) {
  const overLimit = currentSpeed > speedLimit;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={onTogglePlay}
          className="brand-button flex h-11 w-11 items-center justify-center rounded-full"
          aria-label={playing ? "Pausar" : "Reproducir"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>
        <button
          onClick={onStop}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          aria-label="Detener"
        >
          <Square className="h-4 w-4" />
        </button>
        <div className="w-24">
          <p className={`text-2xl font-bold tabular-nums ${overLimit ? "text-red-600" : "text-slate-900"}`}>
            {Math.round(currentSpeed)}
            <span className="ml-1 text-sm font-medium text-slate-400">km/h</span>
          </p>
          <p className="text-xs text-slate-400 tabular-nums">
            {currentTs ? new Date(currentTs).toLocaleTimeString() : "--:--:--"}
          </p>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(total - 1, 0)}
        value={currentIndex}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="brand-range h-1.5 w-full flex-1 cursor-pointer rounded-full"
      />

      <label className="flex shrink-0 items-center gap-2 text-sm text-slate-500">
        Límite
        <input
          type="number"
          min={10}
          max={300}
          value={speedLimit}
          onChange={(e) => onSpeedLimitChange(Number(e.target.value) || 0)}
          className="field-input w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
        />
        km/h
      </label>
    </div>
  );
}
