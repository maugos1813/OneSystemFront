import {
  BarChart3,
  Gauge,
  History,
  Key,
  LogOut,
  Map,
  PanelLeftClose,
  PanelLeftOpen,
  Smartphone,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { trackGlow } from "../../lib/glow";
import { AlertsPanel } from "../AlertsPanel";

const NAV_ITEMS = [
  { to: "/", label: "Mapa", icon: Map, end: true },
  { to: "/cockpit", label: "Cockpit", icon: Gauge, end: false },
  { to: "/analiticas", label: "Analíticas", icon: BarChart3, end: false },
  { to: "/historial", label: "Historial", icon: History, end: false },
  { to: "/vehiculos", label: "Vehículos", icon: Truck, end: false },
  { to: "/dispositivos", label: "Dispositivos", icon: Smartphone, end: false },
  { to: "/api-keys", label: "API Keys", icon: Key, end: false },
];

/** Below `lg` there isn't room for the nav rail *and* the vehicle list *and* the map, so it starts collapsed there. */
function prefersOpenByDefault(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

export function AppLayout() {
  const { currentUser, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(prefersOpenByDefault);

  return (
    <div className="flex h-screen bg-[#f5f6fb]">
      {navOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 max-w-[85vw] overflow-hidden border-r border-violet-100 bg-white transition-all duration-200 lg:static lg:z-auto ${
          navOpen
            ? "w-64 translate-x-0"
            : "w-64 -translate-x-full lg:w-0 lg:translate-x-0 lg:border-transparent"
        }`}
      >
        <div className="flex h-full w-64 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-violet-100 px-5 py-4">
            <div className="flex min-w-0 items-center gap-2">
              <img
                src="/logo.jpg"
                alt="OneSystem"
                className="h-9 w-9 shrink-0 rounded-2xl object-cover shadow-md shadow-blue-200/60"
              />
              <span className="truncate text-lg font-semibold text-slate-900">
                One<span className="brand-text-gradient">System</span>
              </span>
            </div>
            <button
              onClick={() => setNavOpen(false)}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-slate-700"
              aria-label="Ocultar menú"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
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
                      : "text-slate-600 hover:bg-violet-50 hover:text-slate-900"
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
        <header className="flex items-center justify-between gap-3 border-b border-violet-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {!navOpen && (
              <button
                onClick={() => setNavOpen(true)}
                className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-violet-50 hover:text-slate-900"
                aria-label="Mostrar menú"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {currentUser?.orgName ?? "..."}
              </p>
              <p className="hidden truncate text-xs text-slate-500 sm:block">{currentUser?.email}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <AlertsPanel />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 sm:px-3"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
