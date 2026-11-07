import {
  BarChart3,
  BellRing,
  FileCheck,
  History,
  Map,
  MapPin,
  Settings,
  Smartphone,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { MessageKey } from "../i18n";
import type { AdminSectionKey, ModuleKey } from "./modules";
import type { CurrentUser } from "./types";

export interface OneTrackNavItem {
  to: string;
  label: MessageKey;
  icon: LucideIcon;
  end: boolean;
  /** The section an admin can grant; owner/admin always have it. */
  module?: ModuleKey;
  /** Opens with any of these sections instead (Vehículos also holds each vehicle's maintenance). */
  anyOf?: readonly ModuleKey[];
  /** Administration: only owner/admin, and it cannot be granted to anyone else. */
  ownerAdminOnly?: boolean;
  /** The administration page of the account this is: OneSystec may leave it out for a client. */
  adminSection?: AdminSectionKey;
}

export const ONETRACK_NAV: OneTrackNavItem[] = [
  { to: "/gps", label: "nav.map", icon: Map, end: true, module: "mapa" },
  { to: "/analiticas", label: "nav.analytics", icon: BarChart3, end: false, module: "analiticas" },
  { to: "/historial", label: "nav.history", icon: History, end: false, module: "historial" },
  // Alertas also holds Conducción as a tab: the item opens with either section.
  { to: "/alertas", label: "nav.alerts", icon: BellRing, end: false, anyOf: ["alertas", "conduccion"] },
  { to: "/geocercas", label: "nav.geofences", icon: MapPin, end: false, module: "geocercas" },
  { to: "/vehiculos", label: "nav.vehicles", icon: Truck, end: false, anyOf: ["vehiculos", "mantenimiento"] },
  { to: "/vencimientos", label: "nav.documents", icon: FileCheck, end: false, module: "vencimientos" },
  // Dispositivos holds Salud and EYE BEACON as tabs.
  { to: "/dispositivos", label: "nav.devices", icon: Smartphone, end: false, ownerAdminOnly: true, adminSection: "dispositivos" },
  // The OneTrack settings (working hours, alert thresholds). What belongs to OneSystec itself (clients, team, SIMs, API keys) lives in its
  // own configuration in the portal, not in this menu.
  { to: "/ajustes", label: "nav.settings", icon: Settings, end: false, ownerAdminOnly: true, adminSection: "ajustes" },
];

/** Whether this user may open the section. Owner and admin may open all of what their organization has (OneSystec may limit it). */
export function canOpen(user: CurrentUser | null, item: OneTrackNavItem): boolean {
  if (!user) return false;
  if (user.role === "owner" || user.role === "admin") {
    if (item.adminSection) return user.adminSections?.includes(item.adminSection) ?? true;
    if (item.anyOf) return item.anyOf.some((module) => user.modules.includes(module));
    return item.module ? user.modules.includes(item.module) : true;
  }
  if (item.ownerAdminOnly) return false;
  if (item.anyOf) return item.anyOf.some((module) => user.modules.includes(module));
  return item.module ? user.modules.includes(item.module) : true;
}

export function allowedNav(user: CurrentUser | null): OneTrackNavItem[] {
  return ONETRACK_NAV.filter((item) => canOpen(user, item));
}

/** The nav entry a path belongs to (`/dispositivos/abc` belongs to `/dispositivos`). */
export function navItemForPath(pathname: string): OneTrackNavItem | undefined {
  return ONETRACK_NAV.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
}

/** Where "Desplegar" lands: the first section the user is allowed to open. */
export function firstAllowedPath(user: CurrentUser | null): string | null {
  return allowedNav(user)[0]?.to ?? null;
}
