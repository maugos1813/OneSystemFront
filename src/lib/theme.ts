export type Theme = "light" | "dark";

const THEME_KEY = "onesystem.theme";

export function getStoredTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

export function setStoredTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
}
