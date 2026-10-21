import {
  BarChart3,
  BellRing,
  Cpu,
  Gauge,
  HeartPulse,
  History,
  Key,
  Map,
  MapPin,
  Receipt,
  Settings,
  ShieldCheck,
  Smartphone,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ModuleKey } from "./modules";
import type { CurrentUser } from "./types";

export interface OneTrackNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
  /** The section an admin can grant; owner/admin always have it. */
  module?: ModuleKey;
  /** Administration: only owner/admin, and it cannot be granted to anyone else. */
  ownerAdminOnly?: boolean;
}

export const ONETRACK_NAV: OneTrackNavItem[] = [
  { to: "/gps", label: "Mapa", icon: Map, end: true, module: "mapa" },
  { to: "/cockpit", label: "Cockpit", icon: Gauge, end: false, module: "cockpit" },
  { to: "/analiticas", label: "Analíticas", icon: BarChart3, end: false, module: "analiticas" },
  { to: "/historial", label: "Historial", icon: History, end: false, module: "historial" },
  { to: "/conduccion", label: "Conducción", icon: ShieldCheck, end: false, module: "conduccion" },
  { to: "/alertas", label: "Alertas", icon: BellRing, end: false, module: "alertas" },
  { to: "/geocercas", label: "Geocercas", icon: MapPin, end: false, module: "geocercas" },
  { to: "/peajes", label: "Peajes", icon: Receipt, end: false, module: "peajes" },
  { to: "/salud-dispositivos", label: "Salud del dispositivo", icon: HeartPulse, end: false, ownerAdminOnly: true },
  { to: "/vehiculos", label: "Vehículos", icon: Truck, end: false, module: "vehiculos" },
  { to: "/mantenimiento", label: "Mantenimiento", icon: Wrench, end: false, module: "mantenimiento" },
  { to: "/dispositivos", label: "Dispositivos", icon: Smartphone, end: false, ownerAdminOnly: true },
  // API keys authenticate as full access and org settings affect everyone, so these stay with owner/admin.
  { to: "/sims", label: "SIMs", icon: Cpu, end: false, ownerAdminOnly: true },
  { to: "/api-keys", label: "API Keys", icon: Key, end: false, ownerAdminOnly: true },
  { to: "/ajustes", label: "Ajustes", icon: Settings, end: false, ownerAdminOnly: true },
];

/** Whether this user may open the section. Owner and admin may open all of them. */
export function canOpen(user: CurrentUser | null, item: OneTrackNavItem): boolean {
  if (!user) return false;
  if (user.role === "owner" || user.role === "admin") return true;
  if (item.ownerAdminOnly) return false;
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
