import { APIProvider, Circle, Map, type MapMouseEvent, Polygon } from "@vis.gl/react-google-maps";
import { MapPin, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Panel } from "../components/analytics/Panel";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { useTheme } from "../context/ThemeContext";
import { createGeofence, deleteGeofence, updateGeofence, type UpdateGeofenceInput } from "../lib/api";
import { geofenceZoneColor } from "../lib/geo";
import { trackGlow } from "../lib/glow";
import { DARK_MAP_STYLE, MUTED_MAP_STYLE } from "../lib/mapStyle";
import type { Geofence, GeofenceType } from "../lib/types";

const DEFAULT_CENTER = { lat: 41.9028, lng: 12.4964 };
const DEFAULT_RADIUS_M = 200;

interface Draft {
  id: string | null;
  type: GeofenceType;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  alertOnEnter: boolean;
  alertOnExit: boolean;
}

// A polygon's geometry (e.g. Area B/Area C's official boundaries) is seeded directly, not
// hand-drawn — lat/lng/radiusMeters are unused placeholders when editing one, since only
// its name and alert toggles are editable (see handleSave).
function draftFromGeofence(g: Geofence): Draft {
  return {
    id: g.id,
    type: g.type,
    name: g.name,
    lat: g.lat ?? 0,
    lng: g.lng ?? 0,
    radiusMeters: g.radiusMeters ?? 0,
    alertOnEnter: g.alertOnEnter,
    alertOnExit: g.alertOnExit,
  };
}

export function GeofencesPage() {
  const { currentUser } = useAuth();
  const { geofences, loading, refetchGeofences } = useFleet();
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const canManage = currentUser?.role === "owner" || currentUser?.role === "admin";

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { theme } = useTheme();
  const firstCircle = geofences.find(
    (g): g is Geofence & { lat: number; lng: number } => g.type === "circle" && g.lat != null && g.lng != null,
  );
  const center =
    draft && draft.type === "circle" ? { lat: draft.lat, lng: draft.lng } : (firstCircle ?? DEFAULT_CENTER);

  function startNew() {
    setDraft(null);
    setPlacing(true);
  }

  function cancelDraft() {
    setDraft(null);
    setPlacing(false);
  }

  function handleMapClick(e: MapMouseEvent) {
    if (!placing || !e.detail.latLng) return;
    setDraft({
      id: null,
      type: "circle",
      name: "",
      lat: e.detail.latLng.lat,
      lng: e.detail.latLng.lng,
      radiusMeters: DEFAULT_RADIUS_M,
      alertOnEnter: true,
      alertOnExit: true,
    });
    setPlacing(false);
  }

  async function handleSave() {
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    try {
      if (draft.id) {
        // Geometry (circle position/radius, or a polygon's path) is set once at creation —
        // only rename/toggle alerts here, and for a circle also its position/radius.
        const input: UpdateGeofenceInput = {
          name: draft.name.trim(),
          alertOnEnter: draft.alertOnEnter,
          alertOnExit: draft.alertOnExit,
        };
        if (draft.type === "circle") {
          input.lat = draft.lat;
          input.lng = draft.lng;
          input.radiusMeters = Math.round(draft.radiusMeters);
        }
        await updateGeofence(draft.id, input);
      } else {
        await createGeofence({
          type: "circle",
          name: draft.name.trim(),
          lat: draft.lat,
          lng: draft.lng,
          radiusMeters: Math.round(draft.radiusMeters),
          alertOnEnter: draft.alertOnEnter,
          alertOnExit: draft.alertOnExit,
        });
      }
      refetchGeofences();
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta geocerca?")) return;
    await deleteGeofence(id);
    if (draft?.id === id) setDraft(null);
    refetchGeofences();
  }

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        Falta configurar VITE_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  // A circle being edited gets replaced by its own draggable draft shape below; a polygon's
  // geometry never changes, so it stays rendered normally even while its name is being edited.
  const visibleExisting = geofences.filter((g) => !(g.id === draft?.id && draft?.type === "circle"));

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8 dark:bg-[#0a0e1a]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Geocercas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Zonas circulares o con límites oficiales — te avisamos cuando un vehículo entra o sale.
          </p>
        </div>
        {canManage && !draft && !placing && (
          <button
            onClick={startNew}
            className="brand-button flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Nueva geocerca
          </button>
        )}
      </div>

      <Panel title="Mapa" className="mb-6">
        {placing && (
          <p className="mb-3 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            Hacé click en el mapa para ubicar el centro de la geocerca.
          </p>
        )}
        <div className={`h-80 overflow-hidden rounded-2xl sm:h-96 ${placing ? "cursor-crosshair" : ""}`}>
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={center}
              center={draft && draft.type === "circle" ? { lat: draft.lat, lng: draft.lng } : undefined}
              defaultZoom={13}
              gestureHandling="greedy"
              disableDefaultUI
              styles={theme === "dark" ? DARK_MAP_STYLE : MUTED_MAP_STYLE}
              onClick={handleMapClick}
            >
              {visibleExisting.map((g) => {
                if (g.type === "polygon") {
                  if (!g.path) return null;
                  const color = geofenceZoneColor(g.name);
                  return (
                    <Polygon
                      key={g.id}
                      paths={g.path}
                      strokeColor={color.stroke}
                      strokeOpacity={0.7}
                      strokeWeight={2}
                      fillColor={color.fill}
                      fillOpacity={0.15}
                    />
                  );
                }
                if (g.lat == null || g.lng == null || g.radiusMeters == null) return null;
                return (
                  <Circle
                    key={g.id}
                    center={{ lat: g.lat, lng: g.lng }}
                    radius={g.radiusMeters}
                    strokeColor="#7c3aed"
                    strokeOpacity={0.6}
                    strokeWeight={2}
                    fillColor="#7c3aed"
                    fillOpacity={0.12}
                  />
                );
              })}

              {draft && draft.type === "circle" && (
                <Circle
                  center={{ lat: draft.lat, lng: draft.lng }}
                  radius={draft.radiusMeters}
                  editable
                  draggable
                  strokeColor="#3b82f6"
                  strokeWeight={2}
                  fillColor="#3b82f6"
                  fillOpacity={0.18}
                  onCenterChanged={(c) => c && setDraft((d) => d && { ...d, lat: c.lat(), lng: c.lng() })}
                  onRadiusChanged={(r) => setDraft((d) => d && { ...d, radiusMeters: r })}
                />
              )}
            </Map>
          </APIProvider>
        </div>
      </Panel>

      {draft && (
        <Panel title={draft.id ? "Editar geocerca" : "Nueva geocerca"} className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => d && { ...d, name: e.target.value })}
                placeholder="Depósito central"
                className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            {draft.type === "circle" && (
              <div className="w-full sm:w-36">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Radio (m)
                </label>
                <input
                  type="number"
                  min={10}
                  max={50000}
                  value={Math.round(draft.radiusMeters)}
                  onChange={(e) => setDraft((d) => d && { ...d, radiusMeters: Number(e.target.value) || 0 })}
                  className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
            )}
          </div>
          {draft.type === "polygon" && (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Esta zona tiene límites oficiales — solo se puede renombrar y ajustar sus alertas.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={draft.alertOnEnter}
                onChange={(e) => setDraft((d) => d && { ...d, alertOnEnter: e.target.checked })}
                className="brand-range h-4 w-4"
              />
              Avisar al entrar
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={draft.alertOnExit}
                onChange={(e) => setDraft((d) => d && { ...d, alertOnExit: e.target.checked })}
                className="brand-range h-4 w-4"
              />
              Avisar al salir
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !draft.name.trim()}
              className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={cancelDraft}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
          </div>
        </Panel>
      )}

      {!loading && geofences.length === 0 && !draft && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no creaste ninguna geocerca.</p>
      )}

      {geofences.length > 0 && (
        <div className="space-y-2">
          {geofences.map((g) => (
            <div
              key={g.id}
              onMouseMove={trackGlow}
              className="glow float-card flex items-center gap-3 rounded-2xl border border-white bg-white p-3 shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: `${geofenceZoneColor(g.name).fill}1a`,
                  color: geofenceZoneColor(g.name).stroke,
                }}
              >
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{g.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {g.type === "polygon" ? "Zona con límites oficiales" : `${g.radiusMeters} m de radio`} ·{" "}
                  {g.alertOnEnter && g.alertOnExit
                    ? "entrada y salida"
                    : g.alertOnEnter
                      ? "solo entrada"
                      : g.alertOnExit
                        ? "solo salida"
                        : "sin alertas"}
                </p>
              </div>
              {canManage && (
                <>
                  <button
                    onClick={() => setDraft(draftFromGeofence(g))}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
