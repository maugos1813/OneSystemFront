import { BarChart3, Gauge, LogOut, Map, Smartphone, Truck } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AlertsPanel } from "../AlertsPanel";

const NAV_ITEMS = [
  { to: "/", label: "Mapa", icon: Map, end: true },
  { to: "/cockpit", label: "Cockpit", icon: Gauge, end: false },
  { to: "/analiticas", label: "Analíticas", icon: BarChart3, end: false },
  { to: "/vehiculos", label: "Vehículos", icon: Truck, end: false },
  { to: "/dispositivos", label: "Dispositivos", icon: Smartphone, end: false },
];

export function AppLayout() {
  const { currentUser, logout } = useAuth();

  return (
    <div className="flex h-screen bg-violet-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-violet-100 bg-white">
        <div className="flex items-center gap-2 border-b border-violet-100 px-5 py-4">
          <img src="/logo.jpg" alt="OneSystem" className="h-9 w-9 rounded-xl object-cover shadow-sm shadow-violet-200" />
          <span className="text-lg font-semibold text-slate-900">OneSystem</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-violet-100 text-violet-700"
                    : "text-slate-600 hover:bg-violet-50 hover:text-slate-900"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-violet-100 bg-white px-6 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{currentUser?.orgName ?? "..."}</p>
            <p className="text-xs text-slate-500">{currentUser?.email}</p>
          </div>

          <div className="flex items-center gap-4">
            <AlertsPanel />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-slate-500 transition hover:bg-violet-50 hover:text-slate-900"
            >
              <LogOut className="h-4 w-4" />
              Salir
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
