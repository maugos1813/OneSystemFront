import { Capacitor } from "@capacitor/core";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { RequireAuth } from "./components/layout/RequireAuth";
import { AppUpdateProvider } from "./context/AppUpdateContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider, rememberedLanguage } from "./i18n";
import { useState, type ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
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
import { DriversPage } from "./pages/DriversPage";
import { SimsPage } from "./pages/SimsPage";
import { TeamPage } from "./pages/TeamPage";
import { VehiclesPage } from "./pages/VehiclesPage";
import { VencimientosPage } from "./pages/VencimientosPage";
import { WorkspaceLayout } from "./pages/WorkspaceLayout";

/** Everyone sees the app in their own language: the one an admin set on their account (the last one used here until it loads). */
function AppLanguage({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [remembered] = useState(rememberedLanguage);
  return <LanguageProvider language={currentUser?.language ?? remembered}>{children}</LanguageProvider>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <AppLanguage>
      <AppUpdateProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* Accounts are created by OneSystec: the Android app has no sign-up. */}
            <Route path="/register" element={Capacitor.isNativePlatform() ? <Navigate to="/login" replace /> : <RegisterPage />} />

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
                <Route
                  path="/salud-dispositivos"
                  element={<DeviceHealthPage />}
                />
                <Route path="/vehiculos" element={<VehiclesPage />} />
                <Route path="/mantenimiento" element={<MaintenancePage />} />
                <Route path="/vencimientos" element={<VencimientosPage />} />
                <Route path="/dispositivos" element={<DevicesPage />} />
                <Route
                  path="/dispositivos/:id"
                  element={<DeviceDetailPage />}
                />
                <Route path="/choferes" element={<DriversPage />} />
                <Route path="/sims" element={<SimsPage />} />
                <Route path="/api-keys" element={<ApiKeysPage />} />
                <Route path="/ajustes" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppUpdateProvider>
      </AppLanguage>
      </AuthProvider>
    </ThemeProvider>
  );
}
