import { PageTabs } from "../components/PageTabs";
import { useT } from "../i18n";
import { DeviceHealthPage } from "./DeviceHealthPage";
import { DevicesPage } from "./DevicesPage";
import { DriversPage } from "./DriversPage";

/** Dispositivos, their health and the EYE Beacons (which identify the driver) under one entry. */
export function DevicesHubPage() {
  const t = useT();
  return (
    <PageTabs
      tabs={[
        { key: "dispositivos", label: t("nav.devices"), content: <DevicesPage /> },
        { key: "salud", label: t("nav.deviceHealth"), content: <DeviceHealthPage /> },
        { key: "eye-beacon", label: t("nav.drivers"), content: <DriversPage /> },
      ]}
    />
  );
}
