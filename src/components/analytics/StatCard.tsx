export function StatCard({
  label,
  value,
  accent = "text-zinc-100",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="mb-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">{label}</p>
      <p className={`text-3xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
