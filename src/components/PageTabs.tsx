import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

export interface PageTab {
  key: string;
  label: string;
  content: ReactNode;
}

/**
 * Several views of one section under a single menu entry. The chosen tab lives in the address (`?tab=`) so a link, a reload
 * or the back button lands on the same one. Each tab keeps its own page exactly as it was; only the bar above is new.
 */
export function PageTabs({ tabs }: { tabs: PageTab[] }) {
  const [params, setParams] = useSearchParams();
  const wanted = params.get("tab");
  const active = tabs.find((tab) => tab.key === wanted) ?? tabs[0];
  if (!active) return null;

  function select(key: string) {
    const next = new URLSearchParams(params);
    next.set("tab", key);
    setParams(next, { replace: true });
  }

  return (
    <div className="flex h-full flex-col bg-[#f5f6fb] dark:bg-[#0a0e1a]">
      {tabs.length > 1 && (
        <div role="tablist" className="flex shrink-0 gap-1 overflow-x-auto border-b border-violet-100 bg-white px-4 pt-2 sm:px-6 lg:px-8 dark:border-white/5 dark:bg-[#0d1220]">
          {tabs.map((tab) => {
            const selected = tab.key === active.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => select(tab.key)}
                className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                  selected
                    ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
      {/* Some pages scroll themselves (h-full) and some rely on the box around them, so this one scrolls too. */}
      <div className="styled-scrollbar min-h-0 flex-1 overflow-y-auto">{active.content}</div>
    </div>
  );
}
