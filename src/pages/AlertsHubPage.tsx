import { BellRing, Gauge } from "lucide-react";
import { SectionHub, type HubView } from "../components/SectionHub";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";
import { AlertsPage } from "./AlertsPage";
import { DrivingBehaviorPage } from "./DrivingBehaviorPage";

/** Alertas and Conducción under one entry: a middle screen of cards. Each one appears only if the account has that section. */
export function AlertsHubPage() {
  const t = useT();
  const { currentUser } = useAuth();
  const all = currentUser?.role === "owner" || currentUser?.role === "admin";
  const has = (module: "alertas" | "conduccion") => all || !!currentUser?.modules.includes(module);
  const views: HubView[] = [];
  if (has("alertas")) views.push({ key: "alertas", label: t("nav.alerts"), description: t("hub.alertsDesc"), icon: BellRing, content: <AlertsPage /> });
  if (has("conduccion")) views.push({ key: "conduccion", label: t("nav.driving"), description: t("hub.drivingDesc"), icon: Gauge, content: <DrivingBehaviorPage /> });
  return views.length === 0 ? null : <SectionHub title={t("nav.alerts")} hint={t("hub.chooseHint")} views={views} />;
}
