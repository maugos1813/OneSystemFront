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
    <nav aria-label="OneTrack" className="relative z-10 shrink-0 px-3 pt-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] md:hidden">
      {/* A floating pane of glass, clear of the screen's edges, like the rest of the app's glass. */}
      <ul className="glass mx-auto flex max-w-xl items-stretch justify-around rounded-[1.75rem] px-1.5 py-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="min-w-0 flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-[1.25rem] px-1 py-1.5 text-[11px] font-medium transition ${
                  isActive ? "nav-pill-active font-semibold text-blue-600 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} />
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
