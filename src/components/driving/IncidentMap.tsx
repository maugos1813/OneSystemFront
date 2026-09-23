import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { INCIDENT_COLORS, type Incident } from "../../lib/drivingBehavior";
import { MUTED_MAP_STYLE } from "../../lib/mapStyle";

function incidentIcon(color: string): google.maps.Symbol | undefined {
  if (typeof google === "undefined" || !google.maps?.SymbolPath) return undefined;
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 7,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2,
  };
}

interface IncidentMapProps {
  incidents: Incident[];
  activeIndex: number | null;
}

/** A spare map: one colored pin per incident, dimming the rest when one is selected — no
 * clutter, no full route redrawn here (that's what the Historial page is for). */
export function IncidentMap({ incidents, activeIndex }: IncidentMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Falta configurar VITE_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Sin incidentes en este rango.
      </div>
    );
  }

  const center = (activeIndex !== null ? incidents[activeIndex] : null) ?? incidents[0]!;

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        className="h-full"
        center={{ lat: center.lat, lng: center.lng }}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI
        styles={MUTED_MAP_STYLE}
      >
        {incidents.map((incident, i) => (
          <Marker
            key={i}
            position={{ lat: incident.lat, lng: incident.lng }}
            icon={incidentIcon(INCIDENT_COLORS[incident.type])}
            opacity={activeIndex === null || activeIndex === i ? 1 : 0.35}
          />
        ))}
      </Map>
    </APIProvider>
  );
}
