import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, login as apiLogin, register as apiRegister } from "../lib/api";
import type { RegisterInput } from "../lib/api";
import { clearToken, getToken, setToken } from "../lib/auth";
import { rememberedLanguage, translate } from "../i18n";
import { disablePush, enablePush } from "../lib/push";
import type { CurrentUser } from "../lib/types";

interface AuthContextValue {
  isAuthenticated: boolean;
  currentUser: CurrentUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  logout: () => void;
  /** Reads the user and organization again (after changing the company name or logo). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => getToken() !== null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCurrentUser = useCallback(async () => {
    try {
      const me = await getCurrentUser();
      setCurrentUser(me);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) void loadCurrentUser();
  }, [isAuthenticated, loadCurrentUser]);

  // In the Android app, a signed-in user gets this phone registered for alert notifications.
  const signedInUserId = currentUser?.userId;
  useEffect(() => {
    if (signedInUserId) void enablePush();
  }, [signedInUserId]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await apiLogin(email, password);
      setToken(token);
      setIsAuthenticated(true);
      return true;
    } catch {
      setError(translate(rememberedLanguage(), "auth.badCredentials"));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await apiRegister(input);
      setToken(token);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : translate(rememberedLanguage(), "auth.registerFailed"));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    disablePush();
    clearToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, currentUser, loading, error, login, register, logout, refreshUser: loadCurrentUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
