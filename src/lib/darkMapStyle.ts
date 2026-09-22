/** Muted dark theme for the Google Map, to match the analytics dashboard. */
export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#18181b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#18181b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#71717a" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#3f3f46" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#1f1f23" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#27272a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#52525b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3f3f46" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
];
