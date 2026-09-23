import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { AlertsPage } from "./pages/AlertsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ApiKeysPage } from "./pages/ApiKeysPage";
import { CockpitPage } from "./pages/CockpitPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DeviceHealthPage } from "./pages/DeviceHealthPage";
import { DevicesPage } from "./pages/DevicesPage";
import { DrivingBehaviorPage } from "./pages/DrivingBehaviorPage";
import { GeofencesPage } from "./pages/GeofencesPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SettingsPage } from "./pages/SettingsPage";
import { VehiclesPage } from "./pages/VehiclesPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/cockpit" element={<CockpitPage />} />
            <Route path="/analiticas" element={<AnalyticsPage />} />
            <Route path="/historial" element={<HistoryPage />} />
            <Route path="/conduccion" element={<DrivingBehaviorPage />} />
            <Route path="/alertas" element={<AlertsPage />} />
            <Route path="/geocercas" element={<GeofencesPage />} />
            <Route path="/salud-dispositivos" element={<DeviceHealthPage />} />
            <Route path="/vehiculos" element={<VehiclesPage />} />
            <Route path="/dispositivos" element={<DevicesPage />} />
            <Route path="/api-keys" element={<ApiKeysPage />} />
            <Route path="/ajustes" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
