import { ArrowLeft, ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { trackGlow } from "../lib/glow";

export interface HubView {
  key: string;
  label: string;
  /** One line on what the view is for, under its card's title. */
  description: string;
  icon: LucideIcon;
  content: ReactNode;
}

/**
 * Several views of one section behind a middle screen of big cards (easier to hit with a thumb than a tab bar). The chosen view
 * lives in the address (`?tab=`) so a link, a reload or the back button lands on the same screen; with none chosen, the cards show.
 */
export function SectionHub({ title, hint, views }: { title: string; hint?: string; views: HubView[] }) {
  const [params, setParams] = useSearchParams();
  // Only one view (the rest are not available to this account): no middle screen to choose on.
  if (views.length === 1) return <div className="styled-scrollbar h-full overflow-y-auto bg-[#f5f6fb] dark:bg-[#0a0e1a]">{views[0]!.content}</div>;
  const active = views.find((view) => view.key === params.get("tab"));

  /** Each screen starts clean: what a view put in the address (a chosen vehicle…) does not follow to the next one. */
  function go(key: string | null) {
    setParams(key ? { tab: key } : {});
  }

  if (active) {
    return (
      <div className="flex h-full flex-col bg-[#f5f6fb] dark:bg-[#0a0e1a]">
        <div className="shrink-0 border-b border-violet-100 bg-white px-4 py-2.5 sm:px-6 lg:px-8 dark:border-white/5 dark:bg-[#0d1220]">
          <button
            type="button"
            onClick={() => go(null)}
            className="inline-flex items-center gap-1.5 rounded-lg py-1 pr-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> {title}
          </button>
        </div>
        <div className="styled-scrollbar min-h-0 flex-1 overflow-y-auto">{active.content}</div>
      </div>
    );
  }

  return (
    <div className="styled-scrollbar h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0e1a]">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
      {hint && <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {views.map(({ key, label, description, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => go(key)}
            onMouseMove={trackGlow}
            className="glow float-card flex items-center gap-4 rounded-2xl border border-white bg-white p-5 text-left shadow-lg shadow-slate-200/50 transition active:scale-[0.99] dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
              <Icon className="h-7 w-7" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-slate-900 dark:text-white">{label}</span>
              <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{description}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
          </button>
        ))}
      </div>
    </div>
  );
}
