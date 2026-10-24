import { useState } from "react";

const NEW = "__new__";

/**
 * Picks a flota from the ones that exist, or lets the admin type a new one (a client's flota only exists once a vehicle or a
 * user carries its name). `emptyLabel` is what "no flota" means in the place it is used.
 */
export function FleetGroupSelect({
  value,
  onChange,
  groups,
  emptyLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  groups: readonly string[];
  emptyLabel: string;
  className?: string;
}) {
  const known = value === "" || groups.includes(value);
  const [typing, setTyping] = useState(!known);

  if (typing) {
    return (
      <span className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().slice(0, 50))}
          placeholder="Nombre de la flota"
          autoFocus
          className={className}
        />
        <button
          type="button"
          onClick={() => {
            setTyping(false);
            onChange("");
          }}
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === NEW) {
          setTyping(true);
          onChange("");
        } else onChange(e.target.value);
      }}
      className={className}
    >
      <option value="">{emptyLabel}</option>
      {groups.map((group) => (
        <option key={group} value={group}>
          {group}
        </option>
      ))}
      <option value={NEW}>+ Nueva flota…</option>
    </select>
  );
}
