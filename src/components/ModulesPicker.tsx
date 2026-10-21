import { MODULE_INFO, MODULE_KEYS, MODULE_TEMPLATES, TEMPLATE_LABEL, matchingTemplate, type ModuleKey } from "../lib/modules";

/** Pick which OneTrack sections a client gets: a ready-made package, then fine-tune one by one. */
export function ModulesPicker({
  selected,
  onChange,
  /** Sections the picker may offer (a manager can only hand out what they have). Defaults to all. */
  available = MODULE_KEYS,
}: {
  selected: readonly ModuleKey[];
  onChange: (modules: ModuleKey[]) => void;
  available?: readonly ModuleKey[];
}) {
  const active = matchingTemplate(selected);
  const templates = (Object.keys(MODULE_TEMPLATES) as Array<keyof typeof MODULE_TEMPLATES>).filter((name) =>
    MODULE_TEMPLATES[name].every((key) => available.includes(key)),
  );

  function toggle(key: ModuleKey) {
    onChange(MODULE_KEYS.filter((k) => (k === key ? !selected.includes(k) : selected.includes(k))));
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {templates.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange([...MODULE_TEMPLATES[name]])}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              active === name
                ? "brand-button"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            }`}
          >
            {TEMPLATE_LABEL[name]}
          </button>
        ))}
        {active === null && (
          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            Personalizado
          </span>
        )}
      </div>
      <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {MODULE_KEYS.filter((key) => available.includes(key)).map((key) => (
          <label key={key} className="flex items-start gap-1.5 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={selected.includes(key)}
              onChange={() => toggle(key)}
              className="brand-range mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              {MODULE_INFO[key].label}
              <span className="block text-xs text-slate-400 dark:text-slate-500">{MODULE_INFO[key].hint}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
