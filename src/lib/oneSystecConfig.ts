import { Building2, Cpu, Key, Users, type LucideIcon } from "lucide-react";
import type { MessageKey } from "../i18n";
import type { CurrentUser } from "./types";

/** OneSystec's own configuration, apart from OneTrack's: the clients, the team, the SIMs and the API keys. It opens from the portal. */
export interface ConfigItem {
  to: string;
  label: MessageKey;
  hint: MessageKey;
  icon: LucideIcon;
  allowed: (user: CurrentUser) => boolean;
}

const isAdmin = (user: CurrentUser) => user.role === "owner" || user.role === "admin";

export const ONESYSTEC_CONFIG: ConfigItem[] = [
  { to: "/clientes", label: "config.platform", hint: "config.platformHint", icon: Building2, allowed: (u) => u.isPlatform === true },
  { to: "/equipo", label: "config.team", hint: "config.teamHint", icon: Users, allowed: (u) => u.role !== "viewer" },
  { to: "/sims", label: "nav.sims", hint: "config.simsHint", icon: Cpu, allowed: (u) => u.isPlatform === true },
  {
    to: "/api-keys",
    label: "config.apiKeys",
    hint: "config.apiKeysHint",
    icon: Key,
    allowed: (u) => isAdmin(u) && (u.adminSections?.includes("api_keys") ?? true),
  },
];

export function allowedConfig(user: CurrentUser | null): ConfigItem[] {
  return user ? ONESYSTEC_CONFIG.filter((item) => item.allowed(user)) : [];
}

export function configItemForPath(pathname: string): ConfigItem | undefined {
  return ONESYSTEC_CONFIG.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
}
