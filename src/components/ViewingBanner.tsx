import { Eye } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { stopViewing } from "../lib/auth";

/** While OneSystec looks at a client's account (read-only) this is always on screen, with the way back. */
export function ViewingBanner() {
  const { currentUser } = useAuth();
  if (!currentUser?.viewingAs) return null;

  function leave() {
    // A full reload: every screen drops what it loaded for the client.
    window.location.assign(stopViewing() ? "/clientes" : "/login");
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[1000] flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-slate-900 py-1.5 pr-1.5 pl-4 text-sm text-white shadow-xl ring-1 ring-white/20">
        <Eye className="h-4 w-4 shrink-0 text-sky-300" />
        <span className="min-w-0 truncate">
          Viendo a <strong>{currentUser.viewingAs.orgName}</strong> · solo lectura
        </span>
        <button
          type="button"
          onClick={leave}
          className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-200"
        >
          Volver a OneSystec
        </button>
      </div>
    </div>
  );
}
