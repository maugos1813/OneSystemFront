import type { ReactNode } from "react";
import { trackGlow } from "../../lib/glow";

export function Panel({
  title,
  action,
  className = "",
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      onMouseMove={trackGlow}
      className={`glow float-card rounded-[28px] border border-white bg-white p-4 shadow-lg shadow-slate-200/50 sm:p-6 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}
