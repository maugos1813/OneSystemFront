import { BarChart3, LogOut, Map, Smartphone, Truck } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AlertsPanel } from "../AlertsPanel";

const NAV_ITEMS = [
  { to: "/", label: "Mapa", icon: Map, end: true },
  { to: "/analiticas", label: "Analíticas", icon: BarChart3, end: false },
  { to: "/vehiculos", label: "Vehículos", icon: Truck, end: false },
  { to: "/dispositivos", label: "Dispositivos", icon: Smartphone, end: false },
];

export function AppLayout() {
  const { currentUser, logout } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            OS
          </div>
          <span className="text-lg font-semibold text-slate-900">OneSystem</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{currentUser?.orgName ?? "..."}</p>
            <p className="text-xs text-slate-500">{currentUser?.email}</p>
          </div>

          <div className="flex items-center gap-4">
            <AlertsPanel />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
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
