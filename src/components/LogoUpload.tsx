import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { fileToLogoDataUrl, LOGO_ACCEPT } from "../lib/logoImage";

/** Pick a client's logo: shows the current one, takes a new image and shrinks it for storage. */
export function LogoUpload({
  value,
  onChange,
  name,
}: {
  value: string | null;
  onChange: (logo: string | null) => void;
  /** The company's name, for the placeholder initial. */
  name?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      onChange(await fileToLogoDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la imagen");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-slate-200 dark:ring-white/10">
          {value ? (
            <img src={value} alt="Logo de la empresa" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="brand-gradient flex h-full w-full items-center justify-center rounded-xl text-xl font-bold text-white">
              {(name?.trim().charAt(0) || "?").toUpperCase()}
            </span>
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            <ImagePlus className="h-4 w-4" /> {value ? "Cambiar logo" : "Subir logo"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" /> Quitar
            </button>
          )}
        </div>
        <input ref={input} type="file" accept={LOGO_ACCEPT} className="hidden" onChange={(e) => void handleFile(e.target.files?.[0])} />
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
