import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { useT } from "../../i18n";

/** The recovery codes, shown once: to copy or download, because they are never displayed again. */
export function RecoveryCodes({ codes, tone }: { codes: string[]; tone: "glass" | "app" }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");
  const glass = tone === "glass";

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Without clipboard access the codes can still be downloaded or copied by hand.
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([`OneSystec\n\n${text}\n`], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = t("security.codesFile");
    link.click();
    URL.revokeObjectURL(url);
  }

  const button = glass
    ? "border-white/40 text-white hover:bg-white/10"
    : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5";

  return (
    <div>
      <div
        className={`grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl p-3 font-mono text-sm tracking-wider select-all ${
          glass ? "bg-white text-slate-900" : "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white"
        }`}
      >
        {codes.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={copy} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${button}`}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t("security.copied") : t("security.copy")}
        </button>
        <button type="button" onClick={download} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${button}`}>
          <Download className="h-4 w-4" />
          {t("security.download")}
        </button>
      </div>
    </div>
  );
}
