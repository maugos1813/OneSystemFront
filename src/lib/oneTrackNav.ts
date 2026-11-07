import {
  BarChart3,
  BellRing,
  Building2,
  Cpu,
  FileCheck,
  History,
  Key,
  Map,
  MapPin,
  Settings,
  Smartphone,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { MessageKey } from "../i18n";
import type { ModuleKey } from "./modules";
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
  /** Only OneSystec's own account (hardware: SIMs). A client's owner/admin never sees it. */
  platformOnly?: boolean;
  /** Anyone who can manage people: owner, admin and manager (a viewer cannot). */
  notViewer?: boolean;
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
  { to: "/dispositivos", label: "nav.devices", icon: Smartphone, end: false, ownerAdminOnly: true },
  // API keys authenticate as full access and org settings affect everyone, so these stay with owner/admin.
  { to: "/sims", label: "nav.sims", icon: Cpu, end: false, ownerAdminOnly: true, platformOnly: true },
  // Each organization manages its own people; OneSystec alone sees every client.
  { to: "/equipo", label: "nav.team", icon: Users, end: false, notViewer: true },
  { to: "/clientes", label: "nav.clients", icon: Building2, end: false, platformOnly: true },
  { to: "/api-keys", label: "nav.apiKeys", icon: Key, end: false, ownerAdminOnly: true },
  { to: "/ajustes", label: "nav.settings", icon: Settings, end: false, ownerAdminOnly: true },
];

/** Whether this user may open the section. Owner and admin may open all of them. */
export function canOpen(user: CurrentUser | null, item: OneTrackNavItem): boolean {
  if (!user) return false;
  if (item.platformOnly && !user.isPlatform) return false;
  if (item.notViewer && user.role === "viewer") return false;
  if (user.role === "owner" || user.role === "admin") return true;
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
