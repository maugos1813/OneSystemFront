import { trackGlow } from "../../lib/glow";

const VARIANT_CLASSES = {
  plain: "bg-white text-slate-900 dark:border-white/10 dark:bg-[#111729] dark:text-white",
  mint: "bg-gradient-to-br from-emerald-100 via-white to-white text-slate-900 dark:border-emerald-500/20 dark:from-emerald-500/10 dark:via-[#111729] dark:to-[#111729] dark:text-white",
  violet:
    "bg-gradient-to-br from-sky-100 via-indigo-100 to-violet-100 text-slate-900 dark:border-blue-500/20 dark:from-blue-500/10 dark:via-[#111729] dark:to-[#111729] dark:text-white",
} as const;

export function StatCard({
  label,
  value,
  suffix,
  variant = "plain",
}: {
  label: string;
  value: string;
  suffix?: string;
  variant?: keyof typeof VARIANT_CLASSES;
}) {
  return (
    <div
      onMouseMove={trackGlow}
      className={`glow float-card rounded-[28px] border border-white p-4 shadow-lg shadow-slate-200/50 sm:p-5 ${VARIANT_CLASSES[variant]}`}
    >
      <p className="text-2xl font-semibold tracking-tight break-words sm:text-3xl lg:text-4xl">
        {value}
        {suffix && (
          <span className="ml-1 text-base font-medium text-slate-400 sm:text-lg dark:text-slate-500">{suffix}</span>
        )}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
