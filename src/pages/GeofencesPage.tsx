import { APIProvider, Circle, Map, type MapMouseEvent } from "@vis.gl/react-google-maps";
import { MapPin, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Panel } from "../components/analytics/Panel";
import { useFleet } from "../context/FleetContext";
import { createGeofence, deleteGeofence, updateGeofence } from "../lib/api";
import { trackGlow } from "../lib/glow";
import { MUTED_MAP_STYLE } from "../lib/mapStyle";
import type { Geofence } from "../lib/types";

const DEFAULT_CENTER = { lat: 41.9028, lng: 12.4964 };
const DEFAULT_RADIUS_M = 200;

interface Draft {
  id: string | null;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  alertOnEnter: boolean;
  alertOnExit: boolean;
}

function draftFromGeofence(g: Geofence): Draft {
  return {
    id: g.id,
    name: g.name,
    lat: g.lat,
    lng: g.lng,
    radiusMeters: g.radiusMeters,
    alertOnEnter: g.alertOnEnter,
    alertOnExit: g.alertOnExit,
  };
}

export function GeofencesPage() {
  const { geofences, loading, refetchGeofences } = useFleet();
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const center = draft ?? geofences[0] ?? DEFAULT_CENTER;

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
      const input = {
        name: draft.name.trim(),
        lat: draft.lat,
        lng: draft.lng,
        radiusMeters: Math.round(draft.radiusMeters),
        alertOnEnter: draft.alertOnEnter,
        alertOnExit: draft.alertOnExit,
      };
      if (draft.id) {
        await updateGeofence(draft.id, input);
      } else {
        await createGeofence(input);
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
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Falta configurar VITE_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  const visibleExisting = geofences.filter((g) => g.id !== draft?.id);

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Geocercas</h1>
          <p className="text-sm text-slate-500">Zonas circulares — te avisamos cuando un vehículo entra o sale.</p>
        </div>
        {!draft && !placing && (
          <button onClick={startNew} className="brand-button flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium">
            <Plus className="h-4 w-4" />
            Nueva geocerca
          </button>
        )}
      </div>

      <Panel title="Mapa" className="mb-6">
        {placing && (
          <p className="mb-3 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-700">
            Hacé click en el mapa para ubicar el centro de la geocerca.
          </p>
        )}
        <div className={`h-80 overflow-hidden rounded-2xl sm:h-96 ${placing ? "cursor-crosshair" : ""}`}>
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={center}
              center={draft ? { lat: draft.lat, lng: draft.lng } : undefined}
              defaultZoom={13}
              gestureHandling="greedy"
              disableDefaultUI
              styles={MUTED_MAP_STYLE}
              onClick={handleMapClick}
            >
              {visibleExisting.map((g) => (
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
              ))}

              {draft && (
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => d && { ...d, name: e.target.value })}
                placeholder="Depósito central"
                className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="w-full sm:w-36">
              <label className="mb-1 block text-sm font-medium text-slate-700">Radio (m)</label>
              <input
                type="number"
                min={10}
                max={50000}
                value={Math.round(draft.radiusMeters)}
                onChange={(e) => setDraft((d) => d && { ...d, radiusMeters: Number(e.target.value) || 0 })}
                className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={draft.alertOnEnter}
                onChange={(e) => setDraft((d) => d && { ...d, alertOnEnter: e.target.checked })}
                className="brand-range h-4 w-4"
              />
              Avisar al entrar
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
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
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
          </div>
        </Panel>
      )}

      {!loading && geofences.length === 0 && !draft && (
        <p className="text-sm text-slate-500">Todavía no creaste ninguna geocerca.</p>
      )}

      {geofences.length > 0 && (
        <div className="space-y-2">
          {geofences.map((g) => (
            <div
              key={g.id}
              onMouseMove={trackGlow}
              className="glow float-card flex items-center gap-3 rounded-2xl border border-white bg-white p-3 shadow-sm shadow-slate-200/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{g.name}</p>
                <p className="text-xs text-slate-400">
                  {g.radiusMeters} m de radio · {g.alertOnEnter && g.alertOnExit ? "entrada y salida" : g.alertOnEnter ? "solo entrada" : g.alertOnExit ? "solo salida" : "sin alertas"}
                </p>
              </div>
              <button
                onClick={() => setDraft(draftFromGeofence(g))}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(g.id)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
