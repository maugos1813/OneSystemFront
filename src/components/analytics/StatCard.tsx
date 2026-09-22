export function StatCard({
  label,
  value,
  accent = "text-slate-900",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm shadow-violet-100">
      <p className="mb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</p>
      <p className={`text-3xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
