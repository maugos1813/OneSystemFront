import { List } from "lucide-react";
import { useMemo, useState } from "react";
import { MapView } from "../components/MapView";
import { VehicleDetailPanel } from "../components/VehicleDetailPanel";
import { VehicleList } from "../components/VehicleList";
import { useFleet } from "../context/FleetContext";
import { useDeviceEvents } from "../hooks/useDeviceEvents";
import { usePositionHistory } from "../hooks/usePositionHistory";
import { trackGlow } from "../lib/glow";

/** Below `lg` there isn't room for the vehicle list next to the map, so it starts collapsed there. */
function prefersOpenByDefault(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

type MapView2 = "all" | "DHL" | "UNIVEX";
const VIEWS: { key: MapView2; label: string }[] = [
  { key: "all", label: "Vista General" },
  { key: "DHL", label: "DHL" },
  { key: "UNIVEX", label: "UNIVEX" },
];

export function DashboardPage() {
  const { vehicles: allVehicles, devices, positions, loading, error } = useFleet();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [historyRangeHours, setHistoryRangeHours] = useState<number | null>(null);
  const [listOpen, setListOpen] = useState(prefersOpenByDefault);
  const [view, setView] = useState<MapView2>("all");

  const vehicles = useMemo(
    () => (view === "all" ? allVehicles : allVehicles.filter((v) => v.fleetGroup === view)),
    [allVehicles, view],
  );

  const historyFrom = useMemo(() => {
    if (historyRangeHours === null) return null;
    return new Date(Date.now() - historyRangeHours * 60 * 60 * 1000);
  }, [historyRangeHours]);

  const { history } = usePositionHistory(selectedVehicleId, historyFrom);
  const { events } = useDeviceEvents(selectedVehicleId);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  function changeView(next: MapView2) {
    setView(next);
    setSelectedVehicleId(null);
    setHistoryRangeHours(null);
  }

  function selectVehicle(vehicleId: string) {
    setSelectedVehicleId(vehicleId);
    setHistoryRangeHours(null);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">Cargando...</div>
    );
  }

  if (error) {
    return <div className="flex h-full items-center justify-center text-red-600 dark:text-red-400">{error}</div>;
  }

  return (
    <div className="flex h-full">
      <VehicleList
        vehicles={vehicles}
        devices={devices}
        selectedVehicleId={selectedVehicleId}
        onSelect={selectVehicle}
        open={listOpen}
        onClose={() => setListOpen(false)}
      />
      <div className="relative flex-1">
        <MapView
          vehicles={vehicles}
          positions={positions}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={selectVehicle}
          historyPath={history}
        />

        <div className="float-card absolute top-4 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-white p-1 shadow-lg shadow-slate-300/40 dark:bg-[#111729] dark:shadow-black/40">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => changeView(v.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                view === v.key
                  ? "brand-gradient text-white"
                  : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {!listOpen && (
          <button
            onClick={() => setListOpen(true)}
            onMouseMove={trackGlow}
            className="glow float-card absolute top-16 left-4 flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-lg shadow-slate-300/40 dark:bg-[#111729] dark:text-slate-200 dark:shadow-black/40"
          >
            <List className="h-4 w-4" />
            Vehículos ({vehicles.length})
          </button>
        )}

        {selectedVehicle && (
          <VehicleDetailPanel
            vehicle={selectedVehicle}
            position={positions[selectedVehicle.id] ?? null}
            events={events}
            history={history}
            historyRangeHours={historyRangeHours}
            onHistoryRangeChange={setHistoryRangeHours}
            onClose={() => {
              setSelectedVehicleId(null);
              setHistoryRangeHours(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
