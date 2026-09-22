import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FleetProvider } from "../../context/FleetContext";
import { AppLayout } from "./AppLayout";

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <FleetProvider>
      <AppLayout />
    </FleetProvider>
  );
}
