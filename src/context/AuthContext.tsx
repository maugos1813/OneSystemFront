import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, login as apiLogin, register as apiRegister } from "../lib/api";
import type { RegisterInput } from "../lib/api";
import { clearToken, getToken, setToken } from "../lib/auth";
import type { CurrentUser } from "../lib/types";

interface AuthContextValue {
  isAuthenticated: boolean;
  currentUser: CurrentUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  logout: () => void;
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

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await apiLogin(email, password);
      setToken(token);
      setIsAuthenticated(true);
      return true;
    } catch {
      setError("Email o contraseña incorrectos");
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
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, currentUser, loading, error, login, register, logout }}
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
