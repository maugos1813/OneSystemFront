import { PageTabs, type PageTab } from "../components/PageTabs";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";
import { HistoryPage } from "./HistoryPage";
import { VehiclesPage } from "./VehiclesPage";

/** Both look at the vehicles, so they share one entry: the route of a vehicle first (Storico), then the fleet's list (Flotta). */
export function VehiclesHubPage() {
  const t = useT();
  const { currentUser } = useAuth();
  const has = (module: string) => currentUser?.modules.includes(module as never) ?? false;

  const tabs: PageTab[] = [];
  if (has("historial")) tabs.push({ key: "storico", label: t("nav.history"), content: <HistoryPage /> });
  if (has("vehiculos") || has("mantenimiento")) tabs.push({ key: "flotta", label: t("hub.fleet"), content: <VehiclesPage /> });
  return <PageTabs tabs={tabs} />;
}
