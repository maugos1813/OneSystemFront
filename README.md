# OneSystem Front

Frontend de la plataforma de rastreo de flotas OneSystem. Dashboard tipo SaaS con mapa
de Google, histórico de recorridos y alertas básicas, multi-tenant (cada empresa ve solo
su propia flota). Consume la API de [OneSystemBack](https://github.com/maugos1813/OneSystemBack).

## Stack

React + TypeScript + Vite, Tailwind CSS v4, React Router, `@vis.gl/react-google-maps`.

## Puesta en marcha

```bash
cp .env.example .env
```

Completar en `.env`:
- `VITE_API_URL`: la URL del backend (por defecto apunta al ya desplegado en Railway).
- `VITE_GOOGLE_MAPS_API_KEY`: una API key de Google Cloud con **Maps JavaScript API**
  habilitada (Google exige asociar una cuenta de facturación, aunque el uso normal de
  esta app no supera la cuota gratuita mensual).

```bash
npm install
npm run dev
```

## Estructura

- `src/context/AuthContext.tsx` — sesión (login/registro/logout), token en `localStorage`.
- `src/context/FleetContext.tsx` — vehículos, dispositivos y posiciones (con polling),
  compartido por toda la app para no duplicar pedidos.
- `src/pages/` — pantallas: login, registro, mapa (dashboard), vehículos, dispositivos.
- `src/components/layout/` — `AppLayout` (sidebar + header), `AuthLayout` (login/registro),
  `ProtectedRoute` (redirige a `/login` si no hay sesión).
- `src/lib/api.ts` — cliente HTTP contra el backend.
- `src/lib/alerts.ts` — reglas de alertas (desconectado, voltaje bajo), calculadas en el
  cliente a partir de datos ya cargados, sin pedidos extra.

## Funcionalidad

- **Autoservicio**: una empresa nueva se registra sola (`/register`), reclama su
  dispositivo por IMEI (`/dispositivos`) y da de alta sus vehículos (`/vehiculos`).
- **Mapa en vivo**: posición de cada vehículo, actualizada cada 5s.
- **Histórico**: recorrido de las últimas 24h/7 días dibujado sobre el mapa.
- **Alertas**: campana en el header con avisos de dispositivos desconectados o con
  batería/voltaje bajo.

## Build

```bash
npm run build
npm run lint
```

## Despliegue

Es una SPA estática (sin servidor propio) — cualquier hosting de sitios estáticos sirve
(Vercel, Netlify, Cloudflare Pages, o el mismo Railway como servicio estático). Configurar
`VITE_API_URL` y `VITE_GOOGLE_MAPS_API_KEY` como variables de entorno de build, y agregar
el dominio final del frontend a `CORS_ORIGIN` en el backend.
