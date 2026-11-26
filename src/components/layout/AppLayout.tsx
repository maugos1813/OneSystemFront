import {
  Building2,
  Headset,
  Menu,
  LogOut,
  Moon,
  PanelLeftClose,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useT } from "../../i18n";
import { useFleet } from "../../context/FleetContext";
import { allowedNav, canOpen, NAV_GROUP_LABEL, navItemForPath } from "../../lib/oneTrackNav";
import { AlertsPanel } from "../AlertsPanel";
import { OneSystecMark } from "../OneSystecMark";
import { BottomNav } from "./BottomNav";
import { SUPPORT_EMAIL } from "./LoginCard";

/** Below `lg` there isn't room for the nav rail *and* the vehicle list *and* the map, so it starts collapsed there. */
function prefersOpenByDefault(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

export function AppLayout() {
  const t = useT();
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const { alerts } = useFleet();
  const [navOpen, setNavOpen] = useState(prefersOpenByDefault);

  // A section this account doesn't include isn't just hidden from the menu: typing its address leads back to
  // the first one that is allowed (the server refuses the data anyway).
  const section = navItemForPath(pathname);
  if (currentUser && section && !canOpen(currentUser, section)) {
    return <Navigate to={allowedNav(currentUser)[0]?.to ?? "/"} replace />;
  }

  const name = currentUser?.name.trim() || currentUser?.orgName || "";
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join("") || "OT";
  const roundButton =
    "glass-bubble flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white";

  return (
    <div className="app-shell app-wallpaper relative flex h-screen overflow-hidden">
      <aside
        // The side menu is for tablets and up: on a phone the bottom bar and the start take its place. On a tablet it is a slim rail of
        // icons; on a laptop it is the full menu, which can be folded away. In the light theme it is frosted glass over the wallpaper.
        className={`hidden overflow-hidden border-r border-white/70 bg-white/40 backdrop-blur-2xl backdrop-saturate-150 shadow-[8px_0_30px_-20px_rgba(79,70,229,0.25)] transition-all duration-200 md:block dark:border-white/[0.06] dark:bg-[#070a14]/55 dark:shadow-[8px_0_30px_-20px_rgba(0,0,0,0.8)] ${
          navOpen ? "md:w-[4.75rem] lg:w-64" : "md:w-[4.75rem] lg:w-0 lg:border-transparent"
        }`}
      >
        <div className="flex h-full w-[4.75rem] flex-col lg:w-64">
          <div className="flex items-center justify-center gap-2 px-3 pt-6 pb-4 lg:justify-between lg:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <img
                src="/logos/onetrack-icon.png"
                alt="OneTrack"
                className="h-9 w-9 shrink-0 rounded-2xl object-cover shadow-md shadow-blue-200/60 dark:shadow-none"
              />
              <span className="hidden truncate text-xl font-semibold tracking-tight text-slate-900 lg:inline dark:text-white">
                One<span className="text-blue-600 dark:text-blue-400">Track</span>
              </span>
            </div>
            <button
              onClick={() => setNavOpen(false)}
              className="hidden shrink-0 rounded-lg p-1.5 lg:block text-slate-400 hover:bg-white/70 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label={t("nav.hideMenu")}
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>

          <nav className="styled-scrollbar flex-1 overflow-y-auto px-2 pb-4 lg:px-4">
            {allowedNav(currentUser).map(({ to, label, icon: Icon, end, group }, index, items) => {
              // A heading before the first item of each group (Operatività, Gestione, Sistema); on the tablet's rail, a thin line instead.
              const opensGroup = group !== undefined && group !== items[index - 1]?.group;
              const badge = to === "/alertas" ? alerts.length : 0;
              return (
                <div key={to}>
                  {opensGroup && (
                    <>
                      <p className="hidden px-3 pt-5 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase lg:block dark:text-slate-500">
                        {t(NAV_GROUP_LABEL[group])}
                      </p>
                      <hr className="mx-3 my-2 border-slate-200/80 lg:hidden dark:border-white/10" />
                    </>
                  )}
                  <NavLink
                    to={to}
                    end={end}
                    onClick={() => setNavOpen(prefersOpenByDefault())}
                    className={({ isActive }) =>
                      `relative my-0.5 flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] leading-tight font-medium transition lg:flex-row lg:gap-3 lg:px-3.5 lg:py-2.5 lg:text-[15px] ${
                        isActive
                          ? "nav-pill-active font-semibold"
                          : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                      }`
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {/* Under an icon on a tablet's rail, beside it on a laptop's menu. */}
                    <span className="max-w-full truncate">{t(label)}</span>
                    {badge > 0 && (
                      <>
                        <span className="ml-auto hidden h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-1.5 text-xs font-semibold text-white shadow-md shadow-violet-300/60 lg:flex dark:shadow-none">
                          {badge}
                        </span>
                        <span className="absolute top-1.5 right-3 h-2 w-2 rounded-full bg-violet-500 lg:hidden" />
                      </>
                    )}
                  </NavLink>
                </div>
              );
            })}
          </nav>

          <div className="hidden space-y-2 px-6 py-4 lg:block">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <Headset className="h-4 w-4" />
              {t("workspace.support")}
            </a>
            <OneSystecMark prefix="madeBy" className="flex" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 lg:pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logos/onetrack-icon.png" alt="OneTrack" className="h-8 w-8 shrink-0 rounded-xl object-cover md:hidden" />
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
            {/* The account this is (the company): a glass chip from a tablet up; on a phone just its name, with the signature under it. */}
            <div className="glass hidden min-w-0 items-center gap-3 rounded-2xl py-2 pr-5 pl-3 md:flex">
              <Building2 className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
              <div className="min-w-0 leading-tight">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("workspace.company")}</p>
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{currentUser?.orgName || "..."}</p>
              </div>
            </div>
            <div className="min-w-0 md:hidden">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name || "..."}</p>
              <OneSystecMark className="flex" />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("workspace.themeLight") : t("workspace.themeDark")}
              className={roundButton}
            >
              {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <AlertsPanel />
            <span className="hidden h-7 w-px bg-slate-300/70 sm:block dark:bg-white/10" />
            {/* Who is signed in: initials in a ring and the name (the email on hover). */}
            <div className="hidden items-center gap-2.5 sm:flex" title={currentUser?.email}>
              <span className="glass-bubble flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-slate-700 ring-2 ring-violet-200/70 dark:text-white dark:ring-white/10">
                {initials}
              </span>
              <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-slate-800 lg:inline dark:text-white">{name}</span>
            </div>
            <button onClick={logout} aria-label={t("workspace.signOutShort")} title={t("workspace.signOutShort")} className={roundButton}>
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        {/* Each page scrolls here (pages that manage their own scrolling, like the map or Ajustes, simply fill this box). */}
        <main className="styled-scrollbar min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
