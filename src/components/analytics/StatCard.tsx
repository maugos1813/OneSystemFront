const VARIANT_CLASSES = {
  plain: "bg-white text-slate-900",
  mint: "bg-gradient-to-br from-emerald-100 via-white to-white text-slate-900",
  violet: "bg-gradient-to-br from-violet-200 via-indigo-100 to-white text-slate-900",
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
      className={`rounded-[28px] border border-white p-4 shadow-lg shadow-slate-200/50 sm:p-5 ${VARIANT_CLASSES[variant]}`}
    >
      <p className="text-2xl font-semibold tracking-tight break-words sm:text-3xl lg:text-4xl">
        {value}
        {suffix && <span className="ml-1 text-base font-medium text-slate-400 sm:text-lg">{suffix}</span>}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}
