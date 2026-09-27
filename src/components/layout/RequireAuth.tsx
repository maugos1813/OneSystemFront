import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/** Auth check only — unlike ProtectedRoute, doesn't mount FleetProvider/AppLayout
 * (the GPS sidebar), since the portal page isn't a GPS screen. */
export function RequireAuth() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
