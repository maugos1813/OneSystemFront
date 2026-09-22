import { AVL_ID, type Position } from "./types";

const COLOR_OFF = "#dc2626"; // red-600: ignición apagada
const COLOR_IDLE = "#f97316"; // orange-500: encendido, sin moverse
const COLOR_MOVING = "#16a34a"; // green-600: en movimiento

/**
 * Un círculo rojo/naranja para el vehículo detenido (apagado/encendido), o una flecha
 * verde apuntando en la dirección de marcha (AVL angle: grados desde el norte, en
 * sentido horario — coincide con `rotation` de google.maps.Symbol) cuando se mueve.
 */
export function getVehicleIcon(position: Position | undefined): google.maps.Symbol | undefined {
  // The Maps JS script may not have finished loading on the very first render;
  // undefined falls back to the marker's default pin until it does.
  if (typeof google === "undefined" || !google.maps) return undefined;

  if (!position) {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: "#94a3b8",
      fillOpacity: 1,
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
      fillOpacity: 1,
      strokeColor: "#fff",
      strokeWeight: 1.5,
      rotation: position.angle,
    };
  }

  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: ignitionOn ? COLOR_IDLE : COLOR_OFF,
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2,
  };
}
