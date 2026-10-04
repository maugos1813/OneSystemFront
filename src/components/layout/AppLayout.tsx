import {
  BarChart3,
  BellRing,
  Gauge,
  HeartPulse,
  History,
  Key,
  LogOut,
  Map,
  MapPin,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  ShieldCheck,
  Smartphone,
  Sun,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { trackGlow } from "../../lib/glow";
import { AlertsPanel } from "../AlertsPanel";

const NAV_ITEMS = [
  { to: "/gps", label: "Mapa", icon: Map, end: true },
  { to: "/cockpit", label: "Cockpit", icon: Gauge, end: false },
  { to: "/analiticas", label: "Analíticas", icon: BarChart3, end: false },
  { to: "/historial", label: "Historial", icon: History, end: false },
  { to: "/conduccion", label: "Conducción", icon: ShieldCheck, end: false },
  { to: "/alertas", label: "Alertas", icon: BellRing, end: false },
  { to: "/geocercas", label: "Geocercas", icon: MapPin, end: false },
  { to: "/peajes", label: "Peajes", icon: Receipt, end: false },
  { to: "/salud-dispositivos", label: "Salud del dispositivo", icon: HeartPulse, end: false },
  { to: "/vehiculos", label: "Vehículos", icon: Truck, end: false },
  { to: "/dispositivos", label: "Dispositivos", icon: Smartphone, end: false },
  // The backend now restricts both reading and managing these to owner/admin (API keys
  // authenticate as full access, and org settings affect everyone) — hidden below for
  // anyone else so they never land on a page that just 403s.
  { to: "/api-keys", label: "API Keys", icon: Key, end: false, ownerAdminOnly: true },
  { to: "/ajustes", label: "Ajustes", icon: Settings, end: false, ownerAdminOnly: true },
];

/** Below `lg` there isn't room for the nav rail *and* the vehicle list *and* the map, so it starts collapsed there. */
function prefersOpenByDefault(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

/** This layout *is* the OneTrack app (the portal and login stay OneSystec), so the browser
 * tab takes its name and icon while it's mounted and puts the portal's back on leave. */
function useOneTrackTabIdentity() {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const previous = { title: document.title, href: link?.href, type: link?.type };
    document.title = "OneTrack";
    if (link) {
      link.type = "image/png";
      link.href = "/logos/onetrack-icon.png";
    }
    return () => {
      document.title = previous.title;
      if (link && previous.href) {
        link.href = previous.href;
        link.type = previous.type ?? "";
      }
    };
  }, []);
}

export function AppLayout() {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(prefersOpenByDefault);
  useOneTrackTabIdentity();

  return (
    <div className="flex h-screen bg-[#f5f6fb] dark:bg-[#0a0e1a]">
      {navOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 max-w-[85vw] overflow-hidden border-r border-violet-100 bg-white transition-all duration-200 lg:static lg:z-auto dark:border-white/5 dark:bg-[#0d1220] ${
          navOpen
            ? "w-64 translate-x-0"
            : "w-64 -translate-x-full lg:w-0 lg:translate-x-0 lg:border-transparent"
        }`}
      >
        <div className="flex h-full w-64 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-violet-100 px-5 py-4 dark:border-white/5">
            <Link to="/" className="flex min-w-0 items-center gap-2" title="Volver al portal OneSystec">
              <img
                src="/logos/onetrack-icon.png"
                alt="OneTrack"
                className="h-9 w-9 shrink-0 rounded-2xl object-cover shadow-md shadow-blue-200/60"
              />
              <span className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                One<span className="brand-text-gradient">Track</span>
              </span>
            </Link>
            <button
              onClick={() => setNavOpen(false)}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label="Ocultar menú"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {NAV_ITEMS.filter(
              (item) => !item.ownerAdminOnly || currentUser?.role === "owner" || currentUser?.role === "admin",
            ).map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setNavOpen(prefersOpenByDefault())}
                onMouseMove={trackGlow}
                className={({ isActive }) =>
                  `glow flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "brand-button"
                      : "text-slate-600 hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-violet-100 bg-white px-4 py-3 sm:px-6 dark:border-white/5 dark:bg-[#0d1220]">
          <div className="flex min-w-0 items-center gap-3">
            {!navOpen && (
              <>
                <button
                  onClick={() => setNavOpen(true)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                  aria-label="Mostrar menú"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
                <img src="/logos/onetrack-icon.png" alt="OneTrack" className="h-8 w-8 shrink-0 rounded-xl object-cover" />
              </>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {currentUser?.orgName ?? "..."}
              </p>
              <p className="hidden truncate text-xs text-slate-500 sm:block dark:text-slate-400">
                {currentUser?.email}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"}
              className="flex items-center rounded-xl p-2 text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <AlertsPanel />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 sm:px-3 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 dark:bg-[#0a0e1a]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
