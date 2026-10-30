import { ArrowRight, Loader2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useT } from "../i18n";
import { getVehicleEta } from "../lib/api";
import type { VehicleEta } from "../lib/types";

/** "1 h 12 min", "45 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** "14:35", or "mañana 02:10" when it is not today. */
function formatArrival(iso: string, tomorrow: string): string {
  const at = new Date(iso);
  const time = at.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return at.toDateString() === new Date().toDateString() ? time : `${tomorrow} ${time}`;
}

/** The destination box of the vehicle panel: type a city or an address, see how long the vehicle takes to get there. */
export function EtaInput({
  vehicleId,
  wide,
  onResult,
}: {
  vehicleId: string;
  /** Takes the whole row (when the action grid before it has no free cell). */
  wide: boolean;
  onResult: (result: { eta: VehicleEta | null; error: string | null; loading: boolean }) => void;
}) {
  const t = useT();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const to = text.trim();
    if (to.length < 3 || loading) return;
    setLoading(true);
    onResult({ eta: null, error: null, loading: true });
    try {
      onResult({ eta: await getVehicleEta(vehicleId, to), error: null, loading: false });
    } catch (err) {
      onResult({ eta: null, error: err instanceof Error ? err.message : t("detail.etaError"), loading: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className={`flex items-center gap-1 rounded-xl border border-slate-200 bg-white pr-1 pl-3 focus-within:border-blue-400 dark:border-white/10 dark:bg-white/5 ${
        wide ? "col-span-2" : ""
      }`}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("detail.etaPlaceholder")}
        aria-label={t("detail.etaLabel")}
        maxLength={120}
        className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
      />
      <button
        type="submit"
        disabled={loading || text.trim().length < 3}
        aria-label={t("detail.etaGo")}
        className="brand-button shrink-0 rounded-lg p-1.5 disabled:opacity-40"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}

/** What the box found: how long, how far, when it would arrive and where exactly it understood the destination to be. */
export function EtaResult({
  eta,
  error,
  loading,
  onClear,
}: {
  eta: VehicleEta | null;
  error: string | null;
  loading: boolean;
  onClear: () => void;
}) {
  const t = useT();
  if (loading) return <p className="col-span-2 text-xs text-slate-400 dark:text-slate-500">{t("detail.etaLoading")}</p>;
  if (error) return <p className="col-span-2 text-xs text-red-500">{error}</p>;
  if (!eta) return null;
  return (
    <div className="relative col-span-2 rounded-xl bg-blue-50 px-3 py-2.5 pr-8 dark:bg-blue-500/10">
      <button
        type="button"
        onClick={onClear}
        aria-label={t("detail.etaClear")}
        title={t("detail.etaClear")}
        className="absolute top-2 right-2 rounded-md p-0.5 text-slate-400 hover:bg-white/60 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        {t("detail.etaArrives", { time: formatDuration(eta.durationMin) })}
        <span className="font-normal text-slate-500 dark:text-slate-400"> · {eta.distanceKm} km</span>
      </p>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        {t("detail.etaAround", { time: formatArrival(eta.arrivalAt, t("detail.etaTomorrow")) })} ·{" "}
        {eta.destination.label}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-slate-400 dark:text-slate-500">
        {t("detail.etaNote", { base: formatDuration(eta.baseDurationMin) })}
        {eta.positionAgeMin >= 10 && ` ${t("detail.etaStale", { min: eta.positionAgeMin })}`}
      </p>
    </div>
  );
}
