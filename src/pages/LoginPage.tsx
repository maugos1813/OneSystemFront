import { Navigate, useNavigate } from "react-router-dom";
import { OneSystecLogin } from "../components/layout/OneSystecLogin";
import { OneTrackLogin } from "../components/layout/OneTrackLogin";
import { useAuth } from "../context/AuthContext";
import { isOneTrackApp } from "../lib/appFlavor";

// Which sign-in shows depends on which app this is: the OneTrack app has its own, OneSystec (the web and its app) has the other.
const Screen = isOneTrackApp ? OneTrackLogin : OneSystecLogin;

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function signIn(email: string, password: string) {
    if (await login(email, password)) navigate("/");
  }

  return <Screen onSubmit={signIn} />;
}
