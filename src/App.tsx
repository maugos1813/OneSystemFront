import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ViewingBanner } from "./components/ViewingBanner";
import { OneTrackShell, StartRedirect } from "./components/layout/OneTrackShell";
import { AppUpdateProvider } from "./context/AppUpdateContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider, rememberedLanguage } from "./i18n";
import { useState, type ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
import { AlertsHubPage } from "./pages/AlertsHubPage";
import { ApiKeysPage } from "./pages/ApiKeysPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DevicesHubPage } from "./pages/DevicesHubPage";
import { DeviceDetailPage } from "./pages/DeviceDetailPage";
import { GeofencesPage } from "./pages/GeofencesPage";
import { HomePage } from "./pages/HomePage";
import { VehiclesHubPage } from "./pages/VehiclesHubPage";
import { LinkInfoPage } from "./pages/LinkInfoPage";
import { LoginPage } from "./pages/LoginPage";
import { OAuthAuthorizePage } from "./pages/OAuthAuthorizePage";
import { PlatformPage } from "./pages/PlatformPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SimsPage } from "./pages/SimsPage";
import { TeamPage } from "./pages/TeamPage";
import { VehicleProfilePage } from "./pages/VehicleProfilePage";

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
          <ViewingBanner />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/vincular" element={<LinkInfoPage />} />
            {/* "Sign in with OneTrack": another app asks to read the person's vehicles (login and consent). */}
            <Route path="/oauth/authorize" element={<OAuthAuthorizePage />} />
            {/* Accounts are opened by OneSystec (Clientes): there is no public sign-up. */}
            <Route path="/register" element={<Navigate to="/login" replace />} />

            {/* Old addresses of the clients section. */}
            <Route path="/clientes" element={<Navigate to="/clienti" replace />} />
            <Route path="/administracion" element={<Navigate to="/clienti" replace />} />

            {/* Everything below needs a signed-in account with OneTrack; "/" opens on the first section it may use. */}
            <Route element={<OneTrackShell />}>
              <Route index element={<StartRedirect />} />
              <Route element={<AppLayout />}>
                <Route path="/inicio" element={<HomePage />} />
                {/* OneSystec's way into every client (only for its own people). */}
                <Route path="/clienti" element={<PlatformPage />} />
                <Route path="/sims" element={<SimsPage />} />
                <Route path="/equipo" element={<TeamPage />} />
                <Route path="/api-keys" element={<ApiKeysPage />} />
                <Route path="/gps" element={<DashboardPage />} />
                {/* Cockpit is hidden for now: its page stays in the code, its address leads to the map. */}
                <Route path="/cockpit" element={<Navigate to="/gps" replace />} />
                {/* Analíticas and Vencimientos are gone from the system: an old address leads to the start. */}
                <Route path="/analiticas" element={<Navigate to="/inicio" replace />} />
                {/* The route history is now a tab of Vehículos; its old address (and the links to one vehicle) lead there. */}
                <Route path="/historial" element={<MovedTo to="/vehiculos" tab="storico" />} />
                <Route path="/alertas" element={<AlertsHubPage />} />
                <Route path="/conduccion" element={<MovedTo to="/alertas" tab="conduccion" />} />
                <Route path="/geocercas" element={<GeofencesPage />} />
                <Route path="/salud-dispositivos" element={<MovedTo to="/dispositivos" />} />
                <Route path="/vehiculos" element={<VehiclesHubPage />} />
                <Route path="/vehiculos/:id" element={<VehicleProfilePage />} />
                {/* Maintenance now lives inside each vehicle's profile. */}
                <Route path="/mantenimiento" element={<Navigate to="/vehiculos" replace />} />
                <Route path="/vencimientos" element={<Navigate to="/inicio" replace />} />
                <Route path="/dispositivos" element={<DevicesHubPage />} />
                <Route
                  path="/dispositivos/:id"
                  element={<DeviceDetailPage />}
                />
                <Route path="/choferes" element={<MovedTo to="/dispositivos" tab="eye-beacon" />} />
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
