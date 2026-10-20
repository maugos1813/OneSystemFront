import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { RequireAuth } from "./components/layout/RequireAuth";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AlertsPage } from "./pages/AlertsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ApiKeysPage } from "./pages/ApiKeysPage";
import { CockpitPage } from "./pages/CockpitPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DeviceHealthPage } from "./pages/DeviceHealthPage";
import { DeviceDetailPage } from "./pages/DeviceDetailPage";
import { DevicesPage } from "./pages/DevicesPage";
import { DrivingBehaviorPage } from "./pages/DrivingBehaviorPage";
import { GeofencesPage } from "./pages/GeofencesPage";
import { HistoryPage } from "./pages/HistoryPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SimsPage } from "./pages/SimsPage";
import { TeamPage } from "./pages/TeamPage";
import { TollsPage } from "./pages/TollsPage";
import { VehiclesPage } from "./pages/VehiclesPage";
import { WorkspaceLayout } from "./pages/WorkspaceLayout";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<RequireAuth />}>
              <Route path="/equipo" element={<TeamPage />} />
            </Route>

            {/* "/" is the public site for visitors and the workspace once signed in; OneTrack's pages
                live inside that same shell, so opening OneTrack just folds its bars away. */}
            <Route element={<WorkspaceLayout />}>
              <Route index element={null} />
              <Route element={<AppLayout />}>
                <Route path="/gps" element={<DashboardPage />} />
                <Route path="/cockpit" element={<CockpitPage />} />
                <Route path="/analiticas" element={<AnalyticsPage />} />
                <Route path="/historial" element={<HistoryPage />} />
                <Route path="/conduccion" element={<DrivingBehaviorPage />} />
                <Route path="/alertas" element={<AlertsPage />} />
                <Route path="/geocercas" element={<GeofencesPage />} />
                <Route path="/peajes" element={<TollsPage />} />
                <Route
                  path="/salud-dispositivos"
                  element={<DeviceHealthPage />}
                />
                <Route path="/vehiculos" element={<VehiclesPage />} />
                <Route path="/mantenimiento" element={<MaintenancePage />} />
                <Route path="/dispositivos" element={<DevicesPage />} />
                <Route
                  path="/dispositivos/:id"
                  element={<DeviceDetailPage />}
                />
                <Route path="/sims" element={<SimsPage />} />
                <Route path="/api-keys" element={<ApiKeysPage />} />
                <Route path="/ajustes" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
