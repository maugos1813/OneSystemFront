/**
 * The site is a single page: once opened it never asks for the site again, so a phone that keeps the app in the
 * background goes on running the version it opened with for days, however many updates are published. Coming back to
 * the app, the page asks for the current one and, if its bundle is another, reloads to get it.
 */
const BUNDLE = /\/assets\/index-[\w-]+\.js/;
const RELOAD_GAP_MS = 60_000;
const RELOADED_KEY = "onesystem.versionReloadAt";

export function reloadWhenANewVersionIsOut(): void {
  const running = [...document.scripts].map((script) => script.src.match(BUNDLE)?.[0]).find(Boolean);
  // Not a published build (the dev server has no hashed bundle): nothing to compare.
  if (!running) return;

  let checking = false;
  async function check() {
    if (checking) return;
    checking = true;
    try {
      const html = await (await fetch("/", { cache: "no-store" })).text();
      const latest = html.match(BUNDLE)?.[0];
      if (!latest || latest === running) return;
      // A guard against reloading in a loop if the site ever answers with two different pages in a row.
      const last = Number(sessionStorage.getItem(RELOADED_KEY) ?? 0);
      if (Date.now() - last < RELOAD_GAP_MS) return;
      sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
      window.location.reload();
    } catch {
      // Offline, or storage blocked: it is tried again the next time the app comes back.
    } finally {
      checking = false;
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void check();
  });
  void check();
}
