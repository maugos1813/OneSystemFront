import { Capacitor } from "@capacitor/core";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { RequireAuth } from "./components/layout/RequireAuth";
import { AppUpdateProvider } from "./context/AppUpdateContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider, rememberedLanguage } from "./i18n";
import { useState, type ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
import { AlertsHubPage } from "./pages/AlertsHubPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ApiKeysPage } from "./pages/ApiKeysPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DevicesHubPage } from "./pages/DevicesHubPage";
import { DeviceDetailPage } from "./pages/DeviceDetailPage";
import { GeofencesPage } from "./pages/GeofencesPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LoginPage } from "./pages/LoginPage";
import { PlatformPage } from "./pages/PlatformPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SimsPage } from "./pages/SimsPage";
import { TeamPage } from "./pages/TeamPage";
import { VehicleProfilePage } from "./pages/VehicleProfilePage";
import { VehiclesPage } from "./pages/VehiclesPage";
import { VencimientosPage } from "./pages/VencimientosPage";
import { WorkspaceLayout } from "./pages/WorkspaceLayout";

/** An old address (a bookmark, an old link) that now lives inside another section: same page, same query, the right tab. */
function MovedTo({ to, tab }: { to: string; tab?: string }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (tab) params.set("tab", tab);
  const query = params.toString();
  return <Navigate to={`${to}${query ? `?${query}` : ""}`} replace />;
}

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
              <Route path="/administracion" element={<PlatformPage />} />
            </Route>

            {/* "/" is the public site for visitors and the workspace once signed in; OneTrack's pages
                live inside that same shell, so opening OneTrack just folds its bars away. */}
            <Route element={<WorkspaceLayout />}>
              <Route index element={null} />
              <Route element={<AppLayout />}>
                <Route path="/gps" element={<DashboardPage />} />
                {/* Cockpit is hidden for now: its page stays in the code, its address leads to the map. */}
                <Route path="/cockpit" element={<Navigate to="/gps" replace />} />
                <Route path="/analiticas" element={<AnalyticsPage />} />
                <Route path="/historial" element={<HistoryPage />} />
                <Route path="/alertas" element={<AlertsHubPage />} />
                <Route path="/conduccion" element={<MovedTo to="/alertas" tab="conduccion" />} />
                <Route path="/geocercas" element={<GeofencesPage />} />
                <Route path="/salud-dispositivos" element={<MovedTo to="/dispositivos" tab="salud" />} />
                <Route path="/vehiculos" element={<VehiclesPage />} />
                <Route path="/vehiculos/:id" element={<VehicleProfilePage />} />
                {/* Maintenance now lives inside each vehicle's profile. */}
                <Route path="/mantenimiento" element={<Navigate to="/vehiculos" replace />} />
                <Route path="/vencimientos" element={<VencimientosPage />} />
                <Route path="/dispositivos" element={<DevicesHubPage />} />
                <Route
                  path="/dispositivos/:id"
                  element={<DeviceDetailPage />}
                />
                <Route path="/choferes" element={<MovedTo to="/dispositivos" tab="eye-beacon" />} />
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
