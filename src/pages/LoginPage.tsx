import { Navigate } from "react-router-dom";
import { OneSystecLogin } from "../components/layout/OneSystecLogin";
import { OneTrackLogin } from "../components/layout/OneTrackLogin";
import { useAuth } from "../context/AuthContext";
import { peekReturnTo } from "../lib/afterLogin";
import { isOneTrackApp } from "../lib/appFlavor";

// Which sign-in shows depends on which app this is: the OneTrack app has its own, OneSystec (the web and its app) has the other.
const Screen = isOneTrackApp ? OneTrackLogin : OneSystecLogin;

export function LoginPage() {
  const { isAuthenticated } = useAuth();

  // The card handles the whole sign-in (password, code, first-time setup); once the session starts, this moves on by itself.
  // (or back to the consent page an app sent the person to: see afterLogin.ts)
  if (isAuthenticated) return <Navigate to={peekReturnTo() ?? "/"} replace />;

  return <Screen />;
}
