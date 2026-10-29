/**
 * The vector Map ID the 3D maps (Cockpit, Historial) need for tilt and rotation. "DEMO_MAP_ID" is Google's id for
 * development; set VITE_GOOGLE_MAPS_MAP_ID to a vector Map ID of your own for production.
 */
export const MAP_ID: string = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
