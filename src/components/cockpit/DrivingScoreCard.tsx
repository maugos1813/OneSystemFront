import { NO_SCORE_COLOR, scoreColor } from "../../lib/drivingBehavior";
import type { VehicleDrivingStyle } from "../../lib/types";

const NO_SCORE_REASON: Record<VehicleDrivingStyle["quality"], string> = {
  full: "",
  speeding_only: "Dispositivo con reportes espaciados: solo se mide la velocidad",
  insufficient_data: "Menos de 20 km hoy: aún no hay datos suficientes",
  no_data: "Sin posiciones hoy",
};

export function DrivingScoreCard({ style, loading }: { style: VehicleDrivingStyle | null; loading: boolean }) {
  const scores = style?.scores ?? null;
  const color = scores ? scoreColor(scores.overall) : NO_SCORE_COLOR;
  const { harshBraking, harshAcceleration, harshCornering } = style?.incidents ?? {};

  let subtitle: string;
  if (loading) subtitle = "Calculando...";
  else if (!style) subtitle = "No se pudo calcular";
  else if (!scores) subtitle = NO_SCORE_REASON[style.quality];
  else if (harshBraking === null) subtitle = `${style.incidents.speeding} excesos de velocidad · ${NO_SCORE_REASON.speeding_only.toLowerCase()}`;
  else subtitle = `${harshBraking} frenadas · ${harshAcceleration} aceleraciones · ${harshCornering} curvas bruscas`;

  return (
    <div className="flex items-center gap-4">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {scores?.grade ?? "—"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Estilo de manejo — hoy</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
      </div>
      <span className="shrink-0 text-2xl font-semibold text-slate-900 dark:text-white">{scores?.overall ?? "—"}</span>
    </div>
  );
}
