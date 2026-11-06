import { useT } from "../i18n";

interface OneSystecMarkProps {
  /** "by" is the short form for bars with little room; "madeBy" is the full signature for the foot of a menu. */
  prefix?: "by" | "madeBy";
  /** Whether to draw OneSystec's logo before the text (a bar that already shows it passes false). */
  logo?: boolean;
  /** The display (`flex`, `hidden sm:flex`...) and spacing are the caller's: it knows how much room there is. */
  className?: string;
}

/** The OneSystec signature, so whoever uses the system always sees who made it. */
export function OneSystecMark({ prefix = "by", logo = true, className = "" }: OneSystecMarkProps) {
  const t = useT();
  return (
    <span className={`items-center gap-1.5 text-xs whitespace-nowrap text-slate-400 dark:text-slate-500 ${className}`}>
      {logo && <img src="/logo.jpg" alt="" className="h-4 w-4 shrink-0 rounded object-cover" />}
      <span>
        {prefix === "by" ? "by" : t("brand.madeBy")}{" "}
        <span className="font-semibold text-slate-600 dark:text-slate-300">OneSystec</span>
      </span>
    </span>
  );
}
