import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  ApiError,
  enableLoginTotp,
  getCurrentUser,
  login as apiLogin,
  loginSecondStep,
  logoutRequest,
  startLoginTotpSetup,
  type TotpSetup,
} from "../lib/api";
import { SESSION_ENDED_EVENT, clearToken, getToken, setSession } from "../lib/auth";
import { rememberedLanguage, translate } from "../i18n";
import { disablePush, enablePush } from "../lib/push";
import type { CurrentUser } from "../lib/types";

/** Where a sign-in stands after the password: in, or one step away. */
export type LoginOutcome =
  | { kind: "done" }
  /** The account has an authenticator app: its code is what's missing. */
  | { kind: "code"; mfaToken: string }
  /** An admin account that has no authenticator yet: it must set one up before getting in. */
  | { kind: "setup"; mfaToken: string }
  | { kind: "failed" };

interface AuthContextValue {
  isAuthenticated: boolean;
  currentUser: CurrentUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  /** The second step: a code from the authenticator app, or a recovery code. */
  submitSecondStep: (mfaToken: string, input: { code: string } | { recoveryCode: string }) => Promise<{ ok: boolean; recoveryCodesLeft?: number; usedRecoveryCode?: boolean }>;
  /** An admin's first sign-in: the key and QR address of the authenticator to add. */
  beginAuthenticatorSetup: (mfaToken: string) => Promise<TotpSetup | null>;
  /** Confirms the authenticator with its first code. The session starts only when `finish` is called (after the recovery codes were saved). */
  confirmAuthenticatorSetup: (mfaToken: string, code: string) => Promise<{ recoveryCodes: string[]; finish: () => void } | null>;
  clearError: () => void;
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

  // The server refused to renew the session (signed out from another device, expired, password changed): back to the sign-in.
  useEffect(() => {
    function sessionEnded() {
      disablePush();
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
    window.addEventListener(SESSION_ENDED_EVENT, sessionEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, sessionEnded);
  }, []);

  // In the Android app, a signed-in user gets this phone registered for alert notifications.
  const signedInUserId = currentUser?.userId;
  useEffect(() => {
    if (signedInUserId) void enablePush();
  }, [signedInUserId]);

  const language = () => rememberedLanguage();

  /** The message a failed step shows: the server's own words for a wrong code or a limit, a generic one otherwise. */
  const failure = useCallback((err: unknown, fallback: Parameters<typeof translate>[1]) => {
    setError(err instanceof ApiError && err.status !== 401 && err.message ? err.message : translate(language(), fallback));
  }, []);

  const begin = useCallback((tokens: { token: string; refreshToken?: string }) => {
    setSession(tokens);
    setIsAuthenticated(true);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginOutcome> => {
      setLoading(true);
      setError(null);
      try {
        const answer = await apiLogin(email, password);
        if (answer.mfaRequired) return { kind: "code", mfaToken: answer.mfaToken };
        if (answer.mfaSetupRequired) return { kind: "setup", mfaToken: answer.mfaToken };
        begin(answer);
        return { kind: "done" };
      } catch (err) {
        // A wrong password says so; a "too many attempts" says that (and for how long to wait is in the server's message).
        setError(err instanceof ApiError && err.status === 429 ? err.message : translate(language(), "auth.badCredentials"));
        return { kind: "failed" };
      } finally {
        setLoading(false);
      }
    },
    [begin],
  );

  const submitSecondStep = useCallback<AuthContextValue["submitSecondStep"]>(
    async (mfaToken, input) => {
      setLoading(true);
      setError(null);
      try {
        const answer = await loginSecondStep(mfaToken, input);
        begin(answer);
        return { ok: true, recoveryCodesLeft: answer.recoveryCodesLeft, usedRecoveryCode: answer.usedRecoveryCode };
      } catch (err) {
        failure(err, "login.invalidCode");
        return { ok: false };
      } finally {
        setLoading(false);
      }
    },
    [begin, failure],
  );

  const beginAuthenticatorSetup = useCallback(async (mfaToken: string) => {
    setLoading(true);
    setError(null);
    try {
      return await startLoginTotpSetup(mfaToken);
    } catch (err) {
      failure(err, "login.setupFailed");
      return null;
    } finally {
      setLoading(false);
    }
  }, [failure]);

  const confirmAuthenticatorSetup = useCallback<AuthContextValue["confirmAuthenticatorSetup"]>(
    async (mfaToken, code) => {
      setLoading(true);
      setError(null);
      try {
        const answer = await enableLoginTotp(mfaToken, code);
        return { recoveryCodes: answer.recoveryCodes, finish: () => begin(answer) };
      } catch (err) {
        failure(err, "login.invalidCode");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [begin, failure],
  );

  const logout = useCallback(() => {
    disablePush();
    // Ends the session on the server too (so a copy of the token stops working), but the screen doesn't wait for it.
    // (The request takes the tokens it needs before the device forgets them.)
    void logoutRequest();
    clearToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        loading,
        error,
        login,
        submitSecondStep,
        beginAuthenticatorSetup,
        confirmAuthenticatorSetup,
        clearError: () => setError(null),
        logout,
        refreshUser: loadCurrentUser,
      }}
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
