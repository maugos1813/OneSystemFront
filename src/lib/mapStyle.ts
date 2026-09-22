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
