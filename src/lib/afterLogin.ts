/**
 * Where to go once signed in, for the one case that needs it: an app asked to connect ("Sign in with OneTrack") and the person was not signed in
 * yet. Only the consent page is accepted (never an arbitrary address), and the memory expires.
 */
const KEY = "onesystem.afterLogin";
const MAX_AGE_MS = 15 * 60_000;

export function rememberReturnTo(path: string): void {
  if (!path.startsWith("/oauth/authorize?") || path.length > 2000) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    // Private mode: the person simply lands on the start and the app asks again.
  }
}

/** Where to go, without forgetting it (the page it points to forgets it once it is there). */
export function peekReturnTo(): string | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as { path?: string; at?: number } | null;
    if (!saved?.path || !saved.at || Date.now() - saved.at > MAX_AGE_MS) return null;
    return saved.path.startsWith("/oauth/authorize?") ? saved.path : null;
  } catch {
    return null;
  }
}

export function clearReturnTo(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing to forget
  }
}
