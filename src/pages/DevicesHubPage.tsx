import { Bluetooth } from "lucide-react";
import { SectionHub } from "../components/SectionHub";
import { useT } from "../i18n";
import { TrackerIcon } from "../lib/trackerIcon";
import { DevicesPage } from "./DevicesPage";
import { DriversPage } from "./DriversPage";

/** Dispositivos (with the health of each) and the EYE Beacons (which identify the driver): a middle screen to pick one. */
export function DevicesHubPage() {
  const t = useT();
  return (
    <SectionHub
      title={t("nav.devices")}
      hint={t("hub.chooseHint")}
      views={[
        { key: "dispositivos", label: t("hub.devicesTracker"), description: t("hub.devicesTrackerDesc"), icon: TrackerIcon, content: <DevicesPage /> },
        { key: "eye-beacon", label: t("nav.drivers"), description: t("hub.beaconDesc"), icon: Bluetooth, content: <DriversPage /> },
      ]}
    />
  );
}
