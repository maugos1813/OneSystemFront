import { useFleet } from "../context/FleetContext";
import { AREA_OPTIONS, type AreaFilter } from "../lib/areaFilter";

/** Compact dropdown variant of the área filter, for table/toolbar pages where a pill
 * row would be too heavy. Shares the same selection as AreaFilterPills via FleetContext. */
export function AreaFilterSelect() {
  const { selectedArea, setSelectedArea } = useFleet();

  return (
    <select
      value={selectedArea ?? ""}
      onChange={(e) => setSelectedArea((e.target.value || null) as AreaFilter)}
      className="field-input rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
    >
      <option value="">Todas las áreas</option>
      {AREA_OPTIONS.map((area) => (
        <option key={area} value={area}>
          {area}
        </option>
      ))}
    </select>
  );
}
