import { Navigate } from "react-router-dom";
import { OneTrackLogin } from "../components/layout/OneTrackLogin";
import { useAuth } from "../context/AuthContext";
import { peekReturnTo } from "../lib/afterLogin";

export function LoginPage() {
  const { isAuthenticated } = useAuth();

  // The card handles the whole sign-in (password, code, first-time setup); once the session starts, this moves on by itself.
  // (or back to the consent page an app sent the person to: see afterLogin.ts)
  if (isAuthenticated) return <Navigate to={peekReturnTo() ?? "/"} replace />;

  return <OneTrackLogin />;
}
