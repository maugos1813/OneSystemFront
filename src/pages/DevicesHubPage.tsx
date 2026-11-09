import { PageTabs } from "../components/PageTabs";
import { useT } from "../i18n";
import { DevicesPage } from "./DevicesPage";
import { DriversPage } from "./DriversPage";

/** Dispositivos (with the health of each) and the EYE Beacons (which identify the driver) under one entry. */
export function DevicesHubPage() {
  const t = useT();
  return (
    <PageTabs
      tabs={[
        { key: "dispositivos", label: t("nav.devices"), content: <DevicesPage /> },
        { key: "eye-beacon", label: t("nav.drivers"), content: <DriversPage /> },
      ]}
    />
  );
}
