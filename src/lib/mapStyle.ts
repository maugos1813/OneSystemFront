/** Muted, minimal light theme for the Google Map, to match the app's violet palette. */
export const MUTED_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f3ff" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b8b9e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f3ff" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#ddd6fe" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#ede9fe" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#a78bfa" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ddd6fe" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c4b5fd" }] },
];

/** Same shape as MUTED_MAP_STYLE, recolored to sit on the app's dark navy theme. */
export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0f1524" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8896b3" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1524" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#151b2c" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e2a45" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#5b7bb0" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#26355c" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1730" }] },
];
