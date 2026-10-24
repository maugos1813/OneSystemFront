import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

/** What the server says is the newest Android app (public/android-latest.json, written by scripts/release-android.sh). */
export interface AndroidRelease {
  versionCode: number;
  versionName: string;
  /** Absolute address of the APK. */
  url: string;
  notes: string | null;
}

export interface InstalledApp {
  versionCode: number;
  versionName: string;
}

/** The newest release published on this site. */
export async function fetchLatestRelease(): Promise<AndroidRelease> {
  const res = await fetch(`/android-latest.json?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo consultar la última versión");
  const data = (await res.json()) as { versionCode: number; versionName: string; url: string; notes?: string | null };
  return {
    versionCode: Number(data.versionCode),
    versionName: String(data.versionName),
    // The APK is cached by its version, so a new release is never served from an old copy.
    url: new URL(`${data.url}?v=${data.versionCode}`, window.location.origin).toString(),
    notes: data.notes ?? null,
  };
}

/**
 * The version of the app that is running, or null in a normal browser. An app built before this check existed has no
 * way to tell its version: it is version 1, so it is offered the update.
 */
export async function readInstalledApp(): Promise<InstalledApp | null> {
  if (!Capacitor.isNativePlatform()) return null;
  if (!Capacitor.isPluginAvailable("App")) return { versionCode: 1, versionName: "1.0" };
  const info = await App.getInfo();
  return { versionCode: Number(info.build) || 1, versionName: info.version };
}

export function isUpdateAvailable(installed: InstalledApp | null, latest: AndroidRelease | null): boolean {
  return !!installed && !!latest && latest.versionCode > installed.versionCode;
}

/** Starts the download. On the phone the system browser downloads it and Android offers to install it. */
export async function openDownload(release: AndroidRelease): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Browser")) {
    await Browser.open({ url: release.url });
  } else {
    window.open(release.url, "_blank", "noopener");
  }
}
