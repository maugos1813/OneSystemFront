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
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 ${className}`}>
      <p className="mb-4 text-xs font-medium tracking-wide text-zinc-400 uppercase">{title}</p>
      {children}
    </div>
  );
}
