import {
  BellRing,
  History,
  Home,
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
  /** One line saying what is in it: shown on the shortcut tile of the home. */
  hint?: MessageKey;
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
  // The start: how the fleet is doing, and a shortcut to everything else. Everyone has it.
  { to: "/inicio", label: "nav.home", icon: Home, end: true },
  { to: "/gps", hint: "navHint.map", label: "nav.map", icon: Map, end: true, module: "mapa" },
  { to: "/historial", hint: "navHint.history", label: "nav.history", icon: History, end: false, module: "historial" },
  // Alertas also holds Conducción as a tab: the item opens with either section.
  { to: "/alertas", hint: "navHint.alerts", label: "nav.alerts", icon: BellRing, end: false, anyOf: ["alertas", "conduccion"] },
  { to: "/geocercas", hint: "navHint.geofences", label: "nav.geofences", icon: MapPin, end: false, module: "geocercas" },
  { to: "/vehiculos", hint: "navHint.vehicles", label: "nav.vehicles", icon: Truck, end: false, anyOf: ["vehiculos", "mantenimiento"] },
  // Dispositivos holds Salud and EYE BEACON as tabs.
  { to: "/dispositivos", hint: "navHint.devices", label: "nav.devices", icon: Smartphone, end: false, ownerAdminOnly: true, adminSection: "dispositivos" },
  // The OneTrack settings (working hours, alert thresholds). What belongs to OneSystec itself (clients, team, SIMs, API keys) lives in its
  // own configuration in the portal, not in this menu.
  // Open to everyone: it holds "Mi perfil", and the company settings only for owner/admin (the page decides).
  { to: "/ajustes", hint: "navHint.settings", label: "nav.settings", icon: Settings, end: false },
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

/** The sections that get a place in the phone's bottom bar, in the order they are preferred: the ones people use all day. */
const BOTTOM_PRIORITY = ["/gps", "/alertas", "/vehiculos", "/historial", "/geocercas", "/dispositivos", "/ajustes"];
const BOTTOM_SLOTS = 4;
export const HOME_PATH = "/inicio";

/** The phone's bottom bar: the start, then the four sections this account uses most that it is allowed to open. */
export function bottomNav(user: CurrentUser | null): OneTrackNavItem[] {
  const allowed = allowedNav(user).filter((item) => item.to !== HOME_PATH);
  const ranked = BOTTOM_PRIORITY.map((to) => allowed.find((item) => item.to === to)).filter((item): item is OneTrackNavItem => !!item);
  const home = ONETRACK_NAV.find((item) => item.to === HOME_PATH)!;
  return [home, ...ranked.slice(0, BOTTOM_SLOTS)];
}

/** What does not fit in the bottom bar: it lives on the start, as shortcuts. */
export function homeShortcuts(user: CurrentUser | null): OneTrackNavItem[] {
  const inBar = new Set(bottomNav(user).map((item) => item.to));
  return allowedNav(user).filter((item) => !inBar.has(item.to));
}

/**
 * Where OneTrack opens: the start. An account that has a single section has nothing to choose and a dashboard about one thing would
 * only be in the way, so it opens straight on that section.
 */
export function firstAllowedPath(user: CurrentUser | null): string | null {
  const sections = allowedNav(user).filter((item) => item.to !== HOME_PATH);
  if (sections.length === 0) return user ? HOME_PATH : null;
  return sections.length === 1 ? sections[0]!.to : HOME_PATH;
}
