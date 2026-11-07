const TOKEN_KEY = "onesystem.token";
/** OneSystec's own token, kept aside while it looks at a client's account with a read-only one. */
const ADMIN_TOKEN_KEY = "onesystem.token.admin";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** A normal sign-in: whatever view of a client was open is over. */
export function setToken(token: string): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

/** Starts looking at a client: the read-only token becomes the active one and the real one waits. */
export function startViewing(viewToken: string): void {
  const own = localStorage.getItem(TOKEN_KEY);
  if (own && !localStorage.getItem(ADMIN_TOKEN_KEY)) localStorage.setItem(ADMIN_TOKEN_KEY, own);
  localStorage.setItem(TOKEN_KEY, viewToken);
}

/** Back to one's own account. False when there was nothing to go back to. */
export function stopViewing(): boolean {
  const own = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!own) return false;
  localStorage.setItem(TOKEN_KEY, own);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  return true;
}
