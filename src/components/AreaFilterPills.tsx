import { useFleet } from "../context/FleetContext";
import { AREA_OPTIONS, type AreaFilter } from "../lib/areaFilter";

const PILL_BASE = "rounded-full px-4 py-1.5 text-sm font-medium transition";
const PILL_INACTIVE =
  "bg-white text-slate-500 hover:bg-violet-100 dark:bg-[#111729] dark:text-slate-400 dark:hover:bg-white/10";

/** Área filter (Todas/DHL/UNIVEX), shared app-wide via FleetContext — drop into any
 * page's pill-picker row. Self-contained: no props needed. */
export function AreaFilterPills() {
  const { selectedArea, setSelectedArea } = useFleet();

  function pillClass(area: AreaFilter): string {
    return `${PILL_BASE} ${selectedArea === area ? "brand-button" : PILL_INACTIVE}`;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => setSelectedArea(null)} className={pillClass(null)}>
        Todas las áreas
      </button>
      {AREA_OPTIONS.map((area) => (
        <button key={area} onClick={() => setSelectedArea(area)} className={pillClass(area)}>
          {area}
        </button>
      ))}
    </div>
  );
}
