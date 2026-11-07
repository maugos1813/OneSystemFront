import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useT } from "../../i18n";
import { bottomNav } from "../../lib/oneTrackNav";

/**
 * The phone's navigation: the start and the four sections this account uses most, always under the thumb. Everything else is on the
 * start as shortcuts. On a tablet and up the side menu does this job instead.
 */
export function BottomNav() {
  const t = useT();
  const { currentUser } = useAuth();
  const items = bottomNav(currentUser);

  return (
    <nav
      aria-label="OneTrack"
      className="relative z-10 shrink-0 border-t border-violet-100 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-white/5 dark:bg-[#0d1220]"
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around px-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="min-w-0 flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-1 pt-2 pb-1.5 text-[11px] font-medium transition ${
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-8 w-14 items-center justify-center rounded-full transition ${
                      isActive ? "bg-blue-100 dark:bg-blue-500/20" : ""
                    }`}
                  >
                    <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  <span className="max-w-full truncate">{t(label)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
