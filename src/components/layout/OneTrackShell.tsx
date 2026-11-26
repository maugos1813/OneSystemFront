import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FleetProvider } from "../../context/FleetContext";
import { useT } from "../../i18n";
import { listProducts } from "../../lib/api";
import { firstAllowedPath } from "../../lib/oneTrackNav";

/**
 * The door of the app: whoever is not signed in goes to the sign-in form, and an account that doesn't include OneTrack has nothing
 * to open (only a way out). Everyone else gets the fleet loaded for the pages inside.
 */
export function OneTrackShell() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <SignedIn />;
}

function SignedIn() {
  const t = useT();
  const [hasOneTrack, setHasOneTrack] = useState<boolean | null>(null);

  useEffect(() => {
    listProducts()
      .then((products) => setHasOneTrack(products.some((p) => p.key === "gps")))
      .catch(() => setHasOneTrack(false));
  }, []);

  if (hasOneTrack === null) {
    return (
      <div className="flex h-screen items-center justify-center app-wallpaper text-sm text-slate-400 dark:text-slate-500">
        {t("common.loading")}
      </div>
    );
  }
  if (!hasOneTrack) return <NoOneTrack />;

  return (
    <FleetProvider>
      <Outlet />
    </FleetProvider>
  );
}

/** Where "/" leads: the first section the account may use. */
export function StartRedirect() {
  const { currentUser } = useAuth();
  return <Navigate to={firstAllowedPath(currentUser) ?? "/inicio"} replace />;
}

/** Signed in with an account that doesn't have OneTrack: nothing to open, only a way out. */
function NoOneTrack() {
  const t = useT();
  const { logout } = useAuth();
  return (
    <div className="app-shell flex h-screen flex-col items-center justify-center gap-4 app-wallpaper p-6 text-center">
      <p className="max-w-xs text-sm text-slate-600 dark:text-slate-300">{t("workspace.noOneTrack")}</p>
      <button
        onClick={logout}
        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:text-slate-300"
      >
        {t("workspace.signOut")}
      </button>
    </div>
  );
}
