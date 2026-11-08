import {
  Menu,
  LogOut,
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
import { isOneTrackApp } from "../../lib/appFlavor";
import { trackGlow } from "../../lib/glow";
import { allowedNav, canOpen, navItemForPath } from "../../lib/oneTrackNav";
import { AlertsPanel } from "../AlertsPanel";
import { OneSystecMark } from "../OneSystecMark";
import { BottomNav } from "./BottomNav";

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
  const { collapse, openMenu } = useOutletContext<{ collapse: () => void; openMenu: () => void }>();
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
    <div className="relative flex h-full overflow-hidden bg-[#f5f6fb] dark:bg-[#0a0e1a]">
      <aside
        // The side menu is for tablets and up: on a phone the bottom bar and the start take its place. On a tablet it is a slim rail of
        // icons; on a laptop it is the full menu, which can be folded away.
        className={`hidden overflow-hidden border-r border-violet-100 bg-white transition-all duration-200 md:block dark:border-white/5 dark:bg-[#0d1220] ${
          navOpen ? "md:w-[4.75rem] lg:w-64" : "md:w-[4.75rem] lg:w-0 lg:border-transparent"
        }`}
      >
        <div className="flex h-full w-[4.75rem] flex-col lg:w-64">
          <div className="flex items-center justify-center gap-2 border-b border-violet-100 px-3 py-4 lg:justify-between lg:px-5 dark:border-white/5">
            <div className="flex min-w-0 items-center gap-2">
              <img
                src="/logos/onetrack-icon.png"
                alt="OneTrack"
                className="h-9 w-9 shrink-0 rounded-2xl object-cover shadow-md shadow-blue-200/60"
              />
              <span className="hidden truncate text-lg font-semibold text-slate-900 lg:inline dark:text-white">
                One<span className="brand-text-gradient">Track</span>
              </span>
            </div>
            <button
              onClick={() => setNavOpen(false)}
              className="hidden shrink-0 rounded-lg p-1.5 lg:block text-slate-400 hover:bg-violet-50 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label={t("nav.hideMenu")}
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 lg:px-3">
            {allowedNav(currentUser).map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setNavOpen(prefersOpenByDefault())}
                onMouseMove={trackGlow}
                className={({ isActive }) =>
                  `glow flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] leading-tight font-medium transition lg:flex-row lg:gap-3 lg:px-3 lg:text-sm ${
                    isActive
                      ? "brand-button"
                      : "text-slate-600 hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0 lg:h-4 lg:w-4" />
                {/* Under an icon on a tablet's rail, beside it on a laptop's menu. */}
                <span className="max-w-full truncate">{t(label)}</span>
              </NavLink>
            ))}
          </nav>

          <div className="hidden border-t border-violet-100 px-5 py-3 lg:block dark:border-white/5">
            <OneSystecMark prefix="madeBy" className="flex" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-violet-100 bg-white px-4 py-3 sm:px-6 dark:border-white/5 dark:bg-[#0d1220]">
          <div className="flex min-w-0 items-center gap-3">
            {/* On a phone the OneTrack icon opens the apps menu of the workspace (the OneTrack app has no other apps: it is only the logo). */}
            {isOneTrackApp ? (
              <img src="/logos/onetrack-icon.png" alt="OneTrack" className="h-8 w-8 shrink-0 rounded-xl object-cover md:hidden" />
            ) : (
              <button type="button" onClick={openMenu} aria-label={t("workspace.openMenu")} className="relative shrink-0 rounded-xl md:hidden">
                <img src="/logos/onetrack-icon.png" alt="OneTrack" className="h-8 w-8 rounded-xl object-cover" />
                <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white shadow ring-2 ring-white dark:ring-[#0d1220]">
                  <Menu className="h-2.5 w-2.5" />
                </span>
              </button>
            )}
            {!navOpen && (
              // The OneTrack icon is the menu button, like the client's logo is in the workspace around it: it nudges on a phone.
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label={t("nav.showMenu")}
                className="logo-nudge relative hidden shrink-0 rounded-xl lg:block"
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
              {/* A phone has no room for the email line, so the signature takes it; larger screens show it on the right. */}
              <OneSystecMark className="flex sm:hidden" />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <OneSystecMark className="hidden sm:flex" />
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("workspace.themeLight") : t("workspace.themeDark")}
              // On a phone the workspace's side menu (opened by the logo) has the switch; the OneTrack app has no such menu, so it keeps it.
              className={`${isOneTrackApp ? "flex" : "hidden md:flex"} items-center rounded-xl p-2 text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <AlertsPanel />
            {/* Inside the OneTrack app there is no workspace to fold back into: the way out is signing out. */}
            <button
              onClick={isOneTrackApp ? logout : collapse}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              {isOneTrackApp ? <LogOut className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{t(isOneTrackApp ? "workspace.signOutShort" : "workspace.collapse")}</span>
            </button>
          </div>
        </header>

        {/* The workspace around this clips whatever doesn't fit the screen, so each page scrolls here (pages that
            manage their own scrolling, like the map or Ajustes, simply fill this box). */}
        <main className="styled-scrollbar min-h-0 flex-1 overflow-y-auto dark:bg-[#0a0e1a]">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
