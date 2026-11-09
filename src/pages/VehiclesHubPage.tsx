import { History, Truck } from "lucide-react";
import { SectionHub, type HubView } from "../components/SectionHub";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";
import { HistoryPage } from "./HistoryPage";
import { VehiclesPage } from "./VehiclesPage";

/** Both look at the vehicles, so they share one entry: a middle screen to pick the route of a vehicle (Storico) or the fleet's list (Flotta). */
export function VehiclesHubPage() {
  const t = useT();
  const { currentUser } = useAuth();
  const has = (module: string) => currentUser?.modules.includes(module as never) ?? false;

  const views: HubView[] = [];
  if (has("historial")) views.push({ key: "storico", label: t("nav.history"), description: t("hub.historyDesc"), icon: History, content: <HistoryPage /> });
  if (has("vehiculos") || has("mantenimiento")) views.push({ key: "flotta", label: t("hub.fleet"), description: t("hub.fleetDesc"), icon: Truck, content: <VehiclesPage /> });
  return views.length === 0 ? null : <SectionHub title={t("nav.vehicles")} hint={t("hub.chooseHint")} views={views} />;
}
