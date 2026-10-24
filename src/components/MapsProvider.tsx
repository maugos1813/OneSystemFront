import { APIProvider } from "@vis.gl/react-google-maps";
import type { ReactNode } from "react";
import { useLanguage } from "../i18n";

/** Google Maps with its own labels (countries, cities, "Terms") in the language of the person looking. */
export function MapsProvider({ apiKey, children }: { apiKey: string; children: ReactNode }) {
  const { language } = useLanguage();
  return (
    <APIProvider apiKey={apiKey} language={language}>
      {children}
    </APIProvider>
  );
}
