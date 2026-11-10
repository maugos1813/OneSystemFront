import { AVL_ID, type Position } from "./types";

const COLOR_OFF = "#dc2626"; // red-600: ignición apagada
const COLOR_IDLE = "#f97316"; // orange-500: encendido, sin moverse
const COLOR_MOVING = "#16a34a"; // green-600: en movimiento

/**
 * Un círculo rojo/naranja para el vehículo detenido (apagado/encendido), o una flecha
 * verde apuntando en la dirección de marcha (AVL angle: grados desde el norte, en
 * sentido horario — coincide con `rotation` de google.maps.Symbol) cuando se mueve.
 * `opacity` atenúa solo el ícono (los vehículos no seleccionados): la opacidad del Marker
 * también aclararía la placa, que tiene que verse sólida.
 */
export function getVehicleIcon(position: Position | undefined, opacity = 1): google.maps.Symbol | undefined {
  // The Maps JS script may not have finished loading on the very first render — core
  // `google.maps` can exist before its `SymbolPath` sub-namespace does — so undefined
  // falls back to the marker's default pin until everything we use here is ready.
  if (typeof google === "undefined" || !google.maps?.SymbolPath) return undefined;

  if (!position) {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: "#94a3b8",
      fillOpacity: opacity,
      strokeOpacity: opacity,
      strokeColor: "#fff",
      strokeWeight: 2,
    };
  }

  const ignitionOn = position.ioData[AVL_ID.IGNITION] === 1 || position.ioData[AVL_ID.IGNITION] === "1";
  const moving = position.speed > 0;

  if (moving) {
    return {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 5,
      fillColor: COLOR_MOVING,
      fillOpacity: opacity,
      strokeOpacity: opacity,
      strokeColor: "#fff",
      strokeWeight: 1.5,
      rotation: position.angle,
    };
  }

  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: ignitionOn ? COLOR_IDLE : COLOR_OFF,
    fillOpacity: opacity,
      strokeOpacity: opacity,
    strokeColor: "#fff",
    strokeWeight: 2,
  };
}

/**
 * The wrench over the plate of a vehicle that is broken down: a red disc with a white wrench, sitting above the plate tag and
 * centred on it (the tag is centred on the vehicle). Undefined until the Maps script is ready.
 */
export function getBrokenIcon(): google.maps.Icon | undefined {
  if (typeof google === "undefined" || !google.maps?.Size || !google.maps?.Point) return undefined;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">' +
    '<circle cx="12" cy="12" r="11.5" fill="#dc2626" stroke="#fff" stroke-width="1"/>' +
    '<g transform="translate(4.6 4.6) scale(0.62)" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' +
    "</g></svg>";
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(24, 24),
    // The icon's bottom-centre sits 27 px above the vehicle: clear of the plate tag, which is drawn about 15 px above it.
    anchor: new google.maps.Point(12, 51),
  };
}
