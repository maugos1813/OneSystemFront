import { Capacitor } from "@capacitor/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { rememberedLanguage, translate } from "../i18n";
import {
  fetchLatestRelease,
  isUpdateAvailable,
  openDownload,
  readInstalledApp,
  type AndroidRelease,
  type InstalledApp,
} from "../lib/appUpdate";

interface AppUpdateValue {
  /** True inside the Android app. */
  isNative: boolean;
  installed: InstalledApp | null;
  latest: AndroidRelease | null;
  /** A newer app than the one installed is published. */
  available: boolean;
  checking: boolean;
  error: string | null;
  /** When the last check finished, to say "ya estás al día". */
  checkedAt: Date | null;
  check: () => Promise<void>;
  install: () => Promise<void>;
}

const AppUpdateContext = createContext<AppUpdateValue | null>(null);

const RECHECK_MS = 6 * 60 * 60 * 1000;

/** Looks for a newer Android app when it opens and every few hours, and lets the person look on demand. */
export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const isNative = Capacitor.isNativePlatform();
  const [installed, setInstalled] = useState<InstalledApp | null>(null);
  const [latest, setLatest] = useState<AndroidRelease | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const busy = useRef(false);

  const check = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setChecking(true);
    setError(null);
    try {
      const [app, release] = await Promise.all([readInstalledApp(), fetchLatestRelease()]);
      setInstalled(app);
      setLatest(release);
      setCheckedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : translate(rememberedLanguage(), "update.checkFailed"));
    } finally {
      busy.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();
    if (!isNative) return;
    const timer = setInterval(() => void check(), RECHECK_MS);
    return () => clearInterval(timer);
  }, [check, isNative]);

  const install = useCallback(async () => {
    if (latest) await openDownload(latest);
  }, [latest]);

  const value = useMemo<AppUpdateValue>(
    () => ({ isNative, installed, latest, available: isUpdateAvailable(installed, latest), checking, error, checkedAt, check, install }),
    [isNative, installed, latest, checking, error, checkedAt, check, install],
  );

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppUpdate(): AppUpdateValue {
  const ctx = useContext(AppUpdateContext);
  if (!ctx) throw new Error("useAppUpdate must be used within AppUpdateProvider");
  return ctx;
}
