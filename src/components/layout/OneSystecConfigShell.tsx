import { ArrowLeft } from "lucide-react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useT } from "../../i18n";
import { configItemForPath } from "../../lib/oneSystecConfig";

/** The pages of OneSystec's own configuration (clients, team, SIMs, API keys): outside OneTrack, reached from the portal. */
export function OneSystecConfigShell() {
  const t = useT();
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  const item = configItemForPath(pathname);
  // The server refuses the data anyway; this only keeps the page itself from showing to someone it isn't for.
  if (currentUser && item && !item.allowed(currentUser)) return <Navigate to="/" replace />;

  return (
    <div className="flex h-full flex-col bg-[#f5f6fb] dark:bg-[#0a0e1a]">
      <header className="shrink-0 border-b border-violet-100 bg-white px-4 py-4 sm:px-8 dark:border-white/5 dark:bg-[#0d1220]">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("platform.back")}
        </Link>
      </header>
      <div className="styled-scrollbar min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
