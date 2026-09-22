import type { ReactNode } from "react";

export function Panel({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-violet-100 bg-white p-5 shadow-sm shadow-violet-100 ${className}`}>
      <p className="mb-4 text-xs font-medium tracking-wide text-slate-400 uppercase">{title}</p>
      {children}
    </div>
  );
}
