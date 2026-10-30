import {
  Menu,
  Minimize2,
  Moon,
  PanelLeftClose,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useT } from "../../i18n";
import { trackGlow } from "../../lib/glow";
import { allowedNav, canOpen, navItemForPath } from "../../lib/oneTrackNav";
import { AlertsPanel } from "../AlertsPanel";

/** Below `lg` there isn't room for the nav rail *and* the vehicle list *and* the map, so it starts collapsed there. */
function prefersOpenByDefault(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

/** The OneTrack symbol on a transparent 64 px canvas; `?v=` makes browsers drop the icon they cached for this tab. */
const ONETRACK_TAB_ICON = "/logos/onetrack-favicon.png?v=2";

/** This layout *is* the OneTrack app (the portal and login stay OneSystec), so the browser
 * tab takes its name and icon while it's mounted and puts the portal's back on leave. */
function useOneTrackTabIdentity() {
  useEffect(() => {
    // index.html declares two icons (32 and 192 px) and the browser picks between them: both are swapped, or the portal's can win.
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'));
    const previous = {
      title: document.title,
      links: links.map((link) => ({
        link,
        href: link.getAttribute("href"),
        type: link.getAttribute("type"),
        sizes: link.getAttribute("sizes"),
      })),
    };
    document.title = "OneTrack";
    for (const link of links) {
      link.setAttribute("type", "image/png");
      link.removeAttribute("sizes");
      link.setAttribute("href", ONETRACK_TAB_ICON);
    }
    return () => {
      document.title = previous.title;
      for (const { link, href, type, sizes } of previous.links) {
        if (href !== null) link.setAttribute("href", href);
        if (type !== null) link.setAttribute("type", type);
        if (sizes !== null) link.setAttribute("sizes", sizes);
      }
    };
  }, []);
}

export function AppLayout() {
  const t = useT();
  const { collapse } = useOutletContext<{ collapse: () => void }>();
  const { currentUser } = useAuth();
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
    <div className="relative flex h-full overflow-hidden bg-[#f5f6fb] dark:bg-[#0a0e1a]">
      {navOpen && (
        <div
          className="absolute inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={`absolute inset-y-0 left-0 z-40 max-w-[85vw] overflow-hidden border-r border-violet-100 bg-white transition-all duration-200 lg:static lg:z-auto dark:border-white/5 dark:bg-[#0d1220] ${
          navOpen
            ? "w-64 translate-x-0"
            : "w-64 -translate-x-full lg:w-0 lg:translate-x-0 lg:border-transparent"
        }`}
      >
        <div className="flex h-full w-64 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-violet-100 px-5 py-4 dark:border-white/5">
            <div className="flex min-w-0 items-center gap-2">
              <img
                src="/logos/onetrack-icon.png"
                alt="OneTrack"
                className="h-9 w-9 shrink-0 rounded-2xl object-cover shadow-md shadow-blue-200/60"
              />
              <span className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                One<span className="brand-text-gradient">Track</span>
              </span>
            </div>
            <button
              onClick={() => setNavOpen(false)}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label={t("nav.hideMenu")}
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
                {t(label)}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-violet-100 bg-white px-4 py-3 sm:px-6 dark:border-white/5 dark:bg-[#0d1220]">
          <div className="flex min-w-0 items-center gap-3">
            {!navOpen && (
              // The OneTrack icon is the menu button, like the client's logo is in the workspace around it: it nudges on a phone.
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label={t("nav.showMenu")}
                className="logo-nudge relative shrink-0 rounded-xl"
              >
                <img src="/logos/onetrack-icon.png" alt="OneTrack" className="h-8 w-8 rounded-xl object-cover" />
                <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white shadow ring-2 ring-white dark:ring-[#0d1220]">
                  <Menu className="h-2.5 w-2.5" />
                </span>
              </button>
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
              aria-label={theme === "dark" ? t("workspace.themeLight") : t("workspace.themeDark")}
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
              <span className="hidden sm:inline">{t("workspace.collapse")}</span>
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
