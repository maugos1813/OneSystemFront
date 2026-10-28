import { useEffect, useMemo, useRef, useState } from "react";
import type { Vehicle } from "../lib/types";

interface VehiclePickerProps {
  vehicles: Vehicle[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s-]/g, "");

/** The vehicle choice for pages that look at one vehicle at a time: a searchable dropdown (plate, name or fleet) with
 * previous/next arrows, instead of one pill per vehicle, which stops being usable once the fleet grows. */
export function VehiclePicker({ vehicles, selectedId, onSelect }: VehiclePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const index = vehicles.findIndex((v) => v.id === selectedId);
  const selected = index >= 0 ? vehicles[index]! : null;

  const matches = useMemo(() => {
    const q = norm(query);
    return q ? vehicles.filter((v) => norm(`${v.name} ${v.plate ?? ""} ${v.fleetGroup ?? ""}`).includes(q)) : vehicles;
  }, [vehicles, query]);

  // Grouped by fleet while browsing; a flat list while searching.
  const groups = useMemo(() => {
    const byFleet = new Map<string, Vehicle[]>();
    for (const v of matches) {
      const key = v.fleetGroup ?? "";
      byFleet.set(key, [...(byFleet.get(key) ?? []), v]);
    }
    return [...byFleet].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
  }, [matches]);
  const ordered = useMemo(() => groups.flatMap(([, list]) => list), [groups]);

  useEffect(() => {
    if (!open) return;
    setActive(
      Math.max(
        0,
        ordered.findIndex((v) => v.id === selectedId),
      ),
    );
    search.current?.focus();
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (open) root.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function choose(v: Vehicle) {
    onSelect(v.id);
    setOpen(false);
    setQuery("");
  }

  function step(delta: number) {
    if (vehicles.length === 0) return;
    onSelect(vehicles[(Math.max(index, 0) + delta + vehicles.length) % vehicles.length]!.id);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, ordered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && ordered[active]) {
      e.preventDefault();
      choose(ordered[active]!);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (vehicles.length === 0) return null;

  const arrow =
    "flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 hover:bg-violet-50 dark:bg-[#111729] dark:text-slate-400 dark:hover:bg-white/10";

  return (
    <div ref={root} className="relative flex items-center gap-2">
      <button type="button" aria-label="Vehículo anterior" onClick={() => step(-1)} className={arrow}>
        ‹
      </button>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-56 items-center justify-between gap-3 rounded-xl bg-white px-4 py-2 text-left text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:ring-violet-300 dark:bg-[#111729] dark:text-white dark:ring-white/10 dark:hover:ring-white/25"
      >
        <span className="flex items-center gap-2">
          {selected?.name ?? "Elegí un vehículo"}
          {selected?.fleetGroup && (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-400">
              {selected.fleetGroup}
            </span>
          )}
        </span>
        <span className="text-xs text-slate-400">
          {index >= 0 ? `${index + 1}/${vehicles.length}` : vehicles.length} ▾
        </span>
      </button>

      <button type="button" aria-label="Vehículo siguiente" onClick={() => step(1)} className={arrow}>
        ›
      </button>

      {open && (
        <div className="absolute left-11 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 dark:bg-[#111729] dark:ring-white/10">
          <input
            ref={search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Buscar entre ${vehicles.length} vehículos…`}
            className="w-full border-b border-slate-200 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-slate-400 dark:border-white/10 dark:text-white"
          />
          <div role="listbox" className="max-h-72 overflow-y-auto py-1">
            {ordered.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">Sin resultados.</p>}
            {(() => {
              let n = 0;
              return groups.map(([fleet, list]) => (
                <div key={fleet}>
                  {groups.length > 1 && (
                    <p className="sticky top-0 bg-slate-50 px-4 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:bg-[#0d1322]">
                      {fleet || "Sin flota"} · {list.length}
                    </p>
                  )}
                  {list.map((v) => {
                    const i = n++;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        role="option"
                        aria-selected={v.id === selectedId}
                        data-index={i}
                        onClick={() => choose(v)}
                        onMouseEnter={() => setActive(i)}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                          i === active ? "bg-violet-50 dark:bg-white/10" : ""
                        } ${v.id === selectedId ? "font-semibold text-violet-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-200"}`}
                      >
                        <span>{v.name}</span>
                        {v.plate && v.plate !== v.name && <span className="text-xs text-slate-400">{v.plate}</span>}
                      </button>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
