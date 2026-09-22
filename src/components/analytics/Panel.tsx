import type { ReactNode } from "react";

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
    <div className={`rounded-[28px] border border-white bg-white p-6 shadow-lg shadow-slate-200/50 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}
