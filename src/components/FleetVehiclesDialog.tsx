import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { setFleetVehicles } from "../lib/api";
import { squash } from "../lib/vehicleStatus";
import type { Vehicle } from "../lib/types";

type Filter = "all" | "selected" | "other" | "none";

/**
 * Choosing by hand which vehicles a fleet has: every vehicle of the account in one list with a tick, the ones already in the fleet
 * first. A vehicle is in one fleet at a time, so one that is in another says so and will move; nothing changes until Guardar.
 */
export function FleetVehiclesDialog({
  fleet,
  vehicles,
  onClose,
  onSaved,
}: {
  fleet: string;
  vehicles: Vehicle[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial = useMemo(() => new Set(vehicles.filter((v) => v.fleetGroup === fleet).map((v) => v.id)), [vehicles, fleet]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const label = (v: Vehicle) => v.plate ?? v.name;
  const visible = useMemo(() => {
    const matches = vehicles.filter((v) => {
      if (search && !squash(`${v.plate ?? ""} ${v.name}`).includes(squash(search))) return false;
      if (filter === "selected") return selected.has(v.id);
      if (filter === "other") return !!v.fleetGroup && v.fleetGroup !== fleet;
      if (filter === "none") return !v.fleetGroup;
      return true;
    });
    // The ones in the fleet first, then by plate.
    return matches.sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)) || label(a).localeCompare(label(b)));
  }, [vehicles, search, filter, selected, fleet]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const setMany = (ids: string[], on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const changed = selected.size !== initial.size || [...selected].some((id) => !initial.has(id));
  const moving = vehicles.filter((v) => selected.has(v.id) && v.fleetGroup && v.fleetGroup !== fleet).length;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await setFleetVehicles(fleet, [...selected]);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los vehículos");
    } finally {
      setSaving(false);
    }
  }

  const FILTERS: Array<[Filter, string]> = [
    ["all", `Todos ${vehicles.length}`],
    ["selected", `En esta flota ${selected.size}`],
    ["other", `En otra flota ${vehicles.filter((v) => v.fleetGroup && v.fleetGroup !== fleet).length}`],
    ["none", `Sin flota ${vehicles.filter((v) => !v.fleetGroup).length}`],
  ];

  // In the page body, not inside the card it was opened from: a card that moves or has an effect would otherwise carry the dialog with it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Vehículos de ${fleet}`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-[#111729]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Vehículos de {fleet}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Marca los que esta flota ve. Un vehículo está en una sola flota a la vez.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 border-b border-slate-100 px-5 py-3 dark:border-white/10">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por placa o nombre…"
              className="field-input w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(([value, text]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  filter === value ? "brand-button" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {text}
              </button>
            ))}
          </div>
          <div className="flex gap-3 text-xs">
            <button type="button" onClick={() => setMany(visible.map((v) => v.id), true)} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              Marcar los {visible.length} que se ven
            </button>
            <button type="button" onClick={() => setMany(visible.map((v) => v.id), false)} className="font-medium text-slate-500 hover:underline dark:text-slate-400">
              Quitar los que se ven
            </button>
          </div>
        </div>

        <ul className="styled-scrollbar min-h-0 flex-1 overflow-y-auto">
          {visible.length === 0 && <li className="p-5 text-sm text-slate-500 dark:text-slate-400">Ningún vehículo coincide.</li>}
          {visible.map((v) => {
            const on = selected.has(v.id);
            const elsewhere = !!v.fleetGroup && v.fleetGroup !== fleet;
            return (
              <li key={v.id}>
                <label className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-5 py-3 dark:border-white/5 ${on ? "bg-blue-50/60 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(v.id)} className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900 dark:text-white">{label(v)}</span>
                    {v.plate && v.name !== v.plate && <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{v.name}</span>}
                  </span>
                  {elsewhere ? (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${on ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>
                      {on ? `Pasa desde ${v.fleetGroup}` : `En ${v.fleetGroup}`}
                    </span>
                  ) : !v.fleetGroup && !on ? (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-white/10 dark:text-slate-400">Sin flota</span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>

        <div className="space-y-2 border-t border-slate-100 px-5 py-3 dark:border-white/10">
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selected.size} {selected.size === 1 ? "vehículo" : "vehículos"} en la flota
              {moving > 0 ? ` · ${moving} ${moving === 1 ? "pasa" : "pasan"} de otra flota` : ""}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
                Cancelar
              </button>
              <button type="button" onClick={() => void save()} disabled={saving || !changed} className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
