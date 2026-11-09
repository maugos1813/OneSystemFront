import { X } from "lucide-react";
import type { ReactNode } from "react";
import { ModalPortal } from "../ModalPortal";

export function SecurityModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <ModalPortal>
      <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6 dark:bg-[#111729] dark:text-white">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
            <button type="button" onClick={onClose} aria-label="×" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}

