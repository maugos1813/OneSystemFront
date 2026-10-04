import { BarChart3, BellRing, History, Map, MapPin, Receipt, ShieldCheck, Users, type LucideIcon } from "lucide-react";

/** Everything the public site says lives here, so the copy can be edited without touching layout. */

/** Public contact address, set per deployment (VITE_CONTACT_EMAIL). When unset, the site
 * simply shows no contact link rather than inventing one. */
export const CONTACT_EMAIL: string | undefined = import.meta.env.VITE_CONTACT_EMAIL || undefined;

export interface LandingApp {
  key: string;
  name: string;
  tagline: string;
  description: string;
  logo: string;
}

export const LANDING_APPS: LandingApp[] = [
  {
    key: "gps",
    name: "OneTrack",
    tagline: "Control de flota",
    description: "Ubicación en tiempo real, recorridos, alertas y control de conducción de cada vehículo.",
    logo: "/logos/onetrack-symbol.png",
  },
  {
    key: "driver",
    name: "Gamonal Driver",
    tagline: "Logística",
    description: "Plataforma para gestionar operaciones de transporte y reparto.",
    logo: "/logos/gamonal-driver.png",
  },
  {
    key: "farmacy",
    name: "Gamonal Farmacy",
    tagline: "Logística para farmacias",
    description: "Gestión del reparto y la operación logística de farmacias.",
    logo: "/logos/gamonal-farmacy.png",
  },
  {
    key: "nakamacar",
    name: "NakamaCar",
    tagline: "Vehículos",
    description: "Gestión de vehículos para tu operación.",
    logo: "/logos/nakamacar.png",
  },
];

export interface LandingFeature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const ONETRACK_FEATURES: LandingFeature[] = [
  {
    title: "Mapa en tiempo real",
    description: "Posición, velocidad y estado de cada vehículo, con la patente sobre el mapa y vista satélite.",
    icon: Map,
  },
  {
    title: "Historial y recorridos",
    description: "Reproduce el recorrido de cualquier día y detecta los excesos de velocidad.",
    icon: History,
  },
  {
    title: "Geocercas y zonas",
    description:
      "Círculos o zonas dibujadas, incluidas las de tráfico restringido (como el Área B y el Área C de Milán), con aviso al entrar para evitar multas.",
    icon: MapPin,
  },
  {
    title: "Alertas",
    description: "Velocidad, fuera de horario, motor encendido sin moverse, desconexión y batería baja, en la app y por email.",
    icon: BellRing,
  },
  {
    title: "Estilo de conducción",
    description: "Puntaje por vehículo según frenadas, aceleraciones, curvas y velocidad.",
    icon: ShieldCheck,
  },
  {
    title: "Control de peajes",
    description: "Pasos por peaje detectados a partir del recorrido, ordenados por mes y con marca de uso indebido.",
    icon: Receipt,
  },
  {
    title: "Analíticas",
    description: "Distancia, viajes y actividad de la flota para entender cómo se usa cada vehículo.",
    icon: BarChart3,
  },
  {
    title: "Equipo y permisos",
    description: "Cada persona ve solo las apps y las áreas de la flota que le asignas.",
    icon: Users,
  },
];

export const ACCESS_STEPS: Array<{ title: string; description: string }> = [
  { title: "Inicia sesión", description: "Una sola cuenta de empresa en OneSystec." },
  { title: "Elige tu app", description: "El portal muestra solo las apps habilitadas para ti." },
  { title: "Entra directo", description: "Sin volver a ingresar tus datos en cada aplicación." },
];
