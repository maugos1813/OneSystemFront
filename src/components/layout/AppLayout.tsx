import {
  LogOut,
  Minimize2,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { trackGlow } from "../../lib/glow";
import { allowedNav, canOpen, navItemForPath } from "../../lib/oneTrackNav";
import { AlertsPanel } from "../AlertsPanel";

/** Below `lg` there isn't room for the nav rail *and* the vehicle list *and* the map, so it starts collapsed there. */
function prefersOpenByDefault(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

/** This layout *is* the OneTrack app (the portal and login stay OneSystec), so the browser
 * tab takes its name and icon while it's mounted and puts the portal's back on leave. */
function useOneTrackTabIdentity() {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const previous = { title: document.title, href: link?.href, type: link?.type };
    document.title = "OneTrack";
    if (link) {
      link.type = "image/png";
      link.href = "/logos/onetrack-icon.png";
    }
    return () => {
      document.title = previous.title;
      if (link && previous.href) {
        link.href = previous.href;
        link.type = previous.type ?? "";
      }
    };
  }, []);
}

export function AppLayout() {
  const { collapse } = useOutletContext<{ collapse: () => void }>();
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(prefersOpenByDefault);
  useOneTrackTabIdentity();

  // A section this account doesn't include isn't just hidden from the menu: typing its address leads back to
  // the first one that is allowed (the server refuses the data anyway).
  const section = navItemForPath(pathname);
  if (currentUser && section && !canOpen(currentUser, section)) {
    return <Navigate to={allowedNav(currentUser)[0]?.to ?? "/"} replace />;
  }

  return (
    <div className="flex h-full bg-[#f5f6fb] dark:bg-[#0a0e1a]">
      {navOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 max-w-[85vw] overflow-hidden border-r border-violet-100 bg-white transition-all duration-200 lg:static lg:z-auto dark:border-white/5 dark:bg-[#0d1220] ${
          navOpen
            ? "w-64 translate-x-0"
            : "w-64 -translate-x-full lg:w-0 lg:translate-x-0 lg:border-transparent"
        }`}
      >
        <div className="flex h-full w-64 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-violet-100 px-5 py-4 dark:border-white/5">
            <Link to="/" className="flex min-w-0 items-center gap-2" title="Volver al portal OneSystec">
              <img
                src="/logos/onetrack-icon.png"
                alt="OneTrack"
                className="h-9 w-9 shrink-0 rounded-2xl object-cover shadow-md shadow-blue-200/60"
              />
              <span className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                One<span className="brand-text-gradient">Track</span>
              </span>
            </Link>
            <button
              onClick={() => setNavOpen(false)}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label="Ocultar menú"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {allowedNav(currentUser).map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setNavOpen(prefersOpenByDefault())}
                onMouseMove={trackGlow}
                className={({ isActive }) =>
                  `glow flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "brand-button"
                      : "text-slate-600 hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-violet-100 bg-white px-4 py-3 sm:px-6 dark:border-white/5 dark:bg-[#0d1220]">
          <div className="flex min-w-0 items-center gap-3">
            {!navOpen && (
              <>
                <button
                  onClick={() => setNavOpen(true)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                  aria-label="Mostrar menú"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
                <img src="/logos/onetrack-icon.png" alt="OneTrack" className="h-8 w-8 shrink-0 rounded-xl object-cover" />
              </>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {currentUser?.name.trim() || currentUser?.orgName || "..."}
              </p>
              <p className="hidden truncate text-xs text-slate-500 sm:block dark:text-slate-400">
                {currentUser?.email}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"}
              className="flex items-center rounded-xl p-2 text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <AlertsPanel />
            <button
              onClick={collapse}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <Minimize2 className="h-4 w-4" />
              <span className="hidden sm:inline">Contraer</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 sm:px-3 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        {/* The workspace around this clips whatever doesn't fit the screen, so each page scrolls here (pages that
            manage their own scrolling, like the map or Ajustes, simply fill this box). */}
        <main className="styled-scrollbar min-h-0 flex-1 overflow-y-auto dark:bg-[#0a0e1a]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
