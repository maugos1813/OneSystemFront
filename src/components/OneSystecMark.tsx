import { useT } from "../i18n";
import { OneSystecLogo } from "./OneSystecLogo";

interface OneSystecMarkProps {
  /** "by" is the short form for bars with little room; "madeBy" is the full signature for the foot of a menu. */
  prefix?: "by" | "madeBy";
  /** The display (`flex`, `hidden sm:flex`...) and spacing are the caller's: it knows how much room there is. */
  className?: string;
  /** Height of the logo; by default taller in the full signature than in the short one. */
  logoClassName?: string;
}

/** The OneSystec signature ("by" + its logo), so whoever uses the system always sees who made it. */
export function OneSystecMark({ prefix = "by", className = "", logoClassName }: OneSystecMarkProps) {
  const t = useT();
  return (
    <span className={`items-center gap-1.5 text-xs whitespace-nowrap text-slate-400 dark:text-slate-500 ${className}`}>
      <span>{prefix === "by" ? "by" : t("brand.madeBy")}</span>
      <OneSystecLogo className={logoClassName ?? (prefix === "by" ? "h-8" : "h-9")} />
    </span>
  );
}
