import type { ChangeEvent } from "react";

/** A box for the six digits of the authenticator: numeric keyboard, spaces ignored, "one-time code" so phones can suggest it. */
export function CodeInput({
  value,
  onChange,
  id,
  autoFocus,
  tone,
  onComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  autoFocus?: boolean;
  tone: "glass" | "app";
  /** Called as soon as the sixth digit is typed. */
  onComplete?: (code: string) => void;
}) {
  function handle(e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    onChange(digits);
    if (digits.length === 6) onComplete?.(digits);
  }

  const style =
    tone === "glass"
      ? "border-transparent bg-white text-slate-900 placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/30"
      : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white";

  return (
    <input
      id={id}
      value={value}
      onChange={handle}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={7}
      placeholder="000000"
      autoFocus={autoFocus}
      className={`w-full rounded-xl border px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] focus:outline-none ${style}`}
    />
  );
}
