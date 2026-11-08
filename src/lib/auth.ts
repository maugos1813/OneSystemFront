const TOKEN_KEY = "onesystem.token";
const REFRESH_KEY = "onesystem.refresh";
/** OneSystec's own session, kept aside while it looks at a client's account with a read-only token. */
const ADMIN_TOKEN_KEY = "onesystem.token.admin";
const ADMIN_REFRESH_KEY = "onesystem.refresh.admin";

/** Fired when the session ended for good (the server refused to renew it): the app goes back to the sign-in. */
export const SESSION_ENDED_EVENT = "onesystem:session-ended";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return read(TOKEN_KEY);
}

/** The long-lived half of the session: only used to ask for a new login token, never sent anywhere else. */
export function getRefreshToken(): string | null {
  return read(REFRESH_KEY);
}

/** A normal sign-in: whatever view of a client was open is over. */
export function setSession(session: { token: string; refreshToken?: string | null }): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_REFRESH_KEY);
  localStorage.setItem(TOKEN_KEY, session.token);
  if (session.refreshToken) localStorage.setItem(REFRESH_KEY, session.refreshToken);
  else localStorage.removeItem(REFRESH_KEY);
}

/** The server renewed the login: both tokens are replaced (the old refresh token no longer works), a client view stays as it is. */
export function storeRenewedTokens(token: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearToken(): void {
  for (const key of [ADMIN_TOKEN_KEY, ADMIN_REFRESH_KEY, TOKEN_KEY, REFRESH_KEY]) localStorage.removeItem(key);
}

/** Starts looking at a client: the read-only token becomes the active one and the real session waits. */
export function startViewing(viewToken: string): void {
  if (!localStorage.getItem(ADMIN_TOKEN_KEY)) {
    const own = localStorage.getItem(TOKEN_KEY);
    const ownRefresh = localStorage.getItem(REFRESH_KEY);
    if (own) localStorage.setItem(ADMIN_TOKEN_KEY, own);
    if (ownRefresh) localStorage.setItem(ADMIN_REFRESH_KEY, ownRefresh);
  }
  localStorage.setItem(TOKEN_KEY, viewToken);
  // A view token is read-only, lasts two hours and isn't renewed: it carries no refresh token.
  localStorage.removeItem(REFRESH_KEY);
}

/** Whether a client's account is being looked at right now. */
export function isViewing(): boolean {
  return read(ADMIN_TOKEN_KEY) !== null;
}

/** Back to one's own account. False when there was nothing to go back to. */
export function stopViewing(): boolean {
  const own = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!own) return false;
  localStorage.setItem(TOKEN_KEY, own);
  const ownRefresh = localStorage.getItem(ADMIN_REFRESH_KEY);
  if (ownRefresh) localStorage.setItem(REFRESH_KEY, ownRefresh);
  else localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_REFRESH_KEY);
  return true;
}

/** When a login token stops working (ms since the epoch), read from the token itself; null for a token without a deadline. */
export function tokenExpiresAt(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}
