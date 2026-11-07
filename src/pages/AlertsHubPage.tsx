import { PageTabs, type PageTab } from "../components/PageTabs";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";
import { AlertsPage } from "./AlertsPage";
import { DrivingBehaviorPage } from "./DrivingBehaviorPage";

/** Alertas and Conducción under one entry. Each tab appears only if the account has that section. */
export function AlertsHubPage() {
  const t = useT();
  const { currentUser } = useAuth();
  const all = currentUser?.role === "owner" || currentUser?.role === "admin";
  const has = (module: "alertas" | "conduccion") => all || !!currentUser?.modules.includes(module);
  const tabs: PageTab[] = [
    has("alertas") && { key: "alertas", label: t("nav.alerts"), content: <AlertsPage /> },
    has("conduccion") && { key: "conduccion", label: t("nav.driving"), content: <DrivingBehaviorPage /> },
  ].filter(Boolean) as PageTab[];
  return <PageTabs tabs={tabs} />;
}
