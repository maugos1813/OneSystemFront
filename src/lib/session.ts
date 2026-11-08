import { SESSION_ENDED_EVENT, clearToken, getRefreshToken, getToken, isViewing, storeRenewedTokens, stopViewing, tokenExpiresAt } from "./auth";

const API_URL = import.meta.env.VITE_API_URL;

/** A login token is renewed this long before it runs out, so a request never leaves with one that is about to fail. */
const RENEW_AHEAD_MS = 30_000;

export type RenewOutcome =
  /** There is a valid login token now. */
  | "ok"
  /** The server refused: the session is over (signed out elsewhere, expired, or the refresh token was copied). */
  | "denied"
  /** No answer (offline, server restarting): the session may well be fine, so nothing is forgotten. */
  | "unreachable";

function expiresSoon(token: string): boolean {
  const expiresAt = tokenExpiresAt(token);
  return expiresAt !== null && expiresAt - Date.now() < RENEW_AHEAD_MS;
}

/** One renewal at a time across every tab of the browser: two renewals with the same refresh token would take each other for theft. */
function exclusively<T>(work: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  return locks ? locks.request("onesystem-renew-session", work) : work();
}

async function renew(tokenWhenAsked: string | null): Promise<RenewOutcome> {
  // Another tab may have renewed while this one waited for its turn.
  const now = getToken();
  if (now && now !== tokenWhenAsked && !expiresSoon(now)) return "ok";

  const refreshToken = getRefreshToken();
  if (!refreshToken) return "denied";
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return "unreachable";
  }
  if (res.status === 400 || res.status === 401) return "denied";
  if (!res.ok) return "unreachable";
  const body = (await res.json().catch(() => null)) as { token?: string; refreshToken?: string } | null;
  if (!body?.token || !body.refreshToken) return "unreachable";
  storeRenewedTokens(body.token, body.refreshToken);
  return "ok";
}

let inFlight: Promise<RenewOutcome> | null = null;

/** Asks the server for a new login token. Calls made while one is under way share its answer. */
export function renewSession(): Promise<RenewOutcome> {
  const tokenWhenAsked = getToken();
  inFlight ??= exclusively(() => renew(tokenWhenAsked)).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** The session is over: forget it and let the app go back to the sign-in (or, while looking at a client, back to OneSystec). */
export function endSession(): void {
  if (isViewing()) {
    // The two-hour view of a client ran out: the person's own session is still there.
    stopViewing();
    window.location.assign("/clientes");
    return;
  }
  clearToken();
  window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
}

/** A login token that is good for a while yet, renewing it first if it is about to run out. Null when there is no session. */
export async function getFreshToken(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  if (expiresSoon(token) && (getRefreshToken() || isViewing())) {
    const outcome = await renewSession();
    if (outcome === "denied") {
      endSession();
      return null;
    }
  }
  return getToken();
}
