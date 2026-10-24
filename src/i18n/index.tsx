import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { es, type MessageKey } from "./es";
import { it } from "./it";

export type Language = "es" | "it";
export const LANGUAGES: readonly Language[] = ["es", "it"];
export const LANGUAGE_NAME: Record<Language, string> = { es: "Español", it: "Italiano" };

const DICTIONARIES: Record<Language, Record<MessageKey, string>> = { es, it };
const LOCALES: Record<Language, string> = { es: "es-ES", it: "it-IT" };
const STORAGE_KEY = "onesystem.language";

export type Params = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: Params) => string;

/** The language a person last used on this device, so the sign-in page already speaks it. */
export function rememberedLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "it" || stored === "es" ? stored : "es";
  } catch {
    return "es";
  }
}

function remember(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Without storage the next visit simply starts in Spanish.
  }
}

/**
 * `{name}` placeholders are filled from `params`. A key with a `_one` twin is used when `count` is 1
 * ("1 día" / "{count} días"), so each language words its own plural.
 */
export function translate(language: Language, key: MessageKey, params?: Params): string {
  const dictionary = DICTIONARIES[language];
  const oneKey = `${key}_one` as MessageKey;
  const template = (params?.count === 1 && dictionary[oneKey]) || dictionary[key] || es[key] || key;
  return params ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match)) : template;
}

interface LanguageContextValue {
  language: Language;
  /** For dates and numbers: "es-ES" / "it-IT". */
  locale: string;
  t: Translate;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ language, children }: { language: Language; children: ReactNode }) {
  useEffect(() => {
    remember(language);
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback<Translate>((key, params) => translate(language, key, params), [language]);
  const value = useMemo(() => ({ language, locale: LOCALES[language], t }), [language, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

/** Shorthand for components that only need to translate. */
export function useT(): Translate {
  return useLanguage().t;
}

export type { MessageKey };
