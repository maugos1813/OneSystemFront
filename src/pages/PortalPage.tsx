import {
  BarChart3,
  Car,
  CircleUser,
  Cross,
  ExternalLink,
  Key,
  LogOut,
  Map as MapIcon,
  Moon,
  Route as RouteIcon,
  Settings,
  Sun,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertsPanel } from "../components/AlertsPanel";
import { useAuth } from "../context/AuthContext";
import { FleetProvider } from "../context/FleetContext";
import { useTheme } from "../context/ThemeContext";
import { getProductSsoUrl, listProducts } from "../lib/api";
import { trackGlow } from "../lib/glow";
import type { Product } from "../lib/types";
import { DashboardPage } from "./DashboardPage";

const CONFIG_KEY = "config";

/** Sidebar icon and colour of each product; anything new falls back to its initial. */
const PRODUCT_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  gps: { icon: MapIcon, color: "text-blue-600 dark:text-blue-400" },
  driver: { icon: Truck, color: "text-slate-700 dark:text-slate-300" },
  farmacy: { icon: Cross, color: "text-emerald-600 dark:text-emerald-400" },
  nakamacar: { icon: Car, color: "text-slate-700 dark:text-slate-300" },
};

const SUBTITLES: Record<string, string> = {
  gps: "Seguimiento y control de rutas",
};

/** What OneTrack opens from its home: the same pages as its own menu, one click away. */
const ONETRACK_SHORTCUTS: Array<{ to: string; label: string; icon: LucideIcon; color: string }> = [
  { to: "/gps", label: "Seguimiento", icon: MapIcon, color: "text-blue-600 dark:text-blue-400" },
  { to: "/historial", label: "Rutas", icon: RouteIcon, color: "text-violet-600 dark:text-violet-400" },
  { to: "/vehiculos", label: "Vehículos", icon: Truck, color: "text-teal-600 dark:text-teal-400" },
  { to: "/analiticas", label: "Informes", icon: BarChart3, color: "text-orange-600 dark:text-orange-400" },
];

const PANEL =
  "rounded-3xl border border-white bg-white shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40";

/** Opens an external product in its own tab, already signed in when it supports SSO. */
async function openInNewTab(product: Product): Promise<void> {
  if (!product.url) return;
  if (!product.ssoEnabled) {
    window.open(product.url, "_blank", "noopener,noreferrer");
    return;
  }
  // The tab has to open synchronously (inside the click) to get past popup blockers, and
  // then points wherever the ticket exchange ends up.
  const tab = window.open("", "_blank");
  try {
    const { url } = await getProductSsoUrl(product.key);
    if (tab) tab.location.href = url;
  } catch {
    if (tab) tab.location.href = product.url;
  }
}

export function PortalPage() {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  if (!products) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6fb] text-sm text-slate-400 dark:bg-[#0a0e1a] dark:text-slate-500">
        Cargando...
      </div>
    );
  }

  const shell = <Workspace products={products} />;
  // The bell and the OneTrack dashboard read the fleet, so only accounts with OneTrack load it.
  return products.some((p) => p.key === "gps") ? <FleetProvider>{shell}</FleetProvider> : shell;
}

function Workspace({ products }: { products: Product[] }) {
  const { currentUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const hasOneTrack = products.some((p) => p.key === "gps");
  const selectedKey = params.get("app") ?? products[0]?.key ?? CONFIG_KEY;
  const selected = products.find((p) => p.key === selectedKey) ?? null;
  const showingConfig = selectedKey === CONFIG_KEY;
  const [visited, setVisited] = useState<string[]>([]);

  // External apps stay mounted once opened, so switching tabs doesn't throw away where you were.
  const select = (key: string) => {
    if (products.some((p) => p.key === key && p.type === "external")) {
      setVisited((current) => (current.includes(key) ? current : [...current, key]));
    }
    setParams({ app: key }, { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col gap-3 bg-[#f5f6fb] p-3 transition-colors sm:gap-4 sm:p-4 dark:bg-[#0a0e1a]">
      <TopBar bell={hasOneTrack ? <AlertsPanel /> : null} />

      <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4 lg:flex-row">
        <aside className={`${PANEL} shrink-0 p-3 lg:w-72`}>
          <p className="px-2 pt-1 pb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Aplicaciones
          </p>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {products.map((product) => (
              <SidebarItem key={product.key} active={product.key === selectedKey} onClick={() => select(product.key)}>
                <ProductIcon product={product} />
                {product.name}
              </SidebarItem>
            ))}
          </nav>
          <div className="my-3 hidden border-t border-slate-200 lg:block dark:border-white/10" />
          <SidebarItem active={showingConfig} onClick={() => select(CONFIG_KEY)}>
            <Settings className="h-5 w-5 shrink-0 text-slate-400" />
            Configuración
          </SidebarItem>
        </aside>

        <main className={`${PANEL} min-w-0 flex-1 p-4 sm:p-5`}>
          {showingConfig ? (
            <ConfigPanel role={currentUser?.role} />
          ) : selected?.type === "internal" ? (
            <OneTrackPanel product={selected} />
          ) : selected ? null : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No tienes aplicaciones habilitadas todavía.</p>
          )}

          {products
            .filter((p) => p.type === "external" && (visited.includes(p.key) || p.key === selectedKey))
            .map((product) => (
              <ExternalPanel key={product.key} product={product} visible={product.key === selectedKey && !showingConfig} />
            ))}
        </main>
      </div>
    </div>
  );
}

function TopBar({ bell }: { bell: ReactNode }) {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className={`${PANEL} flex items-center justify-between gap-3 px-4 py-3 sm:px-5`}>
      <div className="flex min-w-0 items-center gap-3">
        <img src="/logo.jpg" alt="OneSystec" className="h-11 w-11 shrink-0 rounded-2xl object-cover shadow-md shadow-blue-200/60" />
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold text-slate-900 dark:text-white">
            One<span className="brand-text-gradient">Systec</span>
          </p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">Business Workspace</p>
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-1">
        {bell}
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Mi cuenta"
          className="rounded-xl p-2 text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <CircleUser className="h-6 w-6" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute top-full right-0 z-20 mt-2 w-64 rounded-2xl border border-violet-100 bg-white p-2 shadow-lg shadow-violet-100 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{currentUser?.name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{currentUser?.email}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{currentUser?.orgName}</p>
              </div>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              >
                <LogOut className="h-4 w-4" /> Salir
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function SidebarItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      onMouseMove={trackGlow}
      className={`glow flex shrink-0 items-center gap-3 rounded-2xl px-3 py-3 text-left text-[15px] font-medium whitespace-nowrap transition lg:w-full ${
        active
          ? "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-100"
          : "text-slate-600 hover:bg-violet-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function ProductIcon({ product }: { product: Product }) {
  const entry = PRODUCT_ICONS[product.key];
  if (!entry) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-200 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
        {product.name.charAt(0)}
      </span>
    );
  }
  const Icon = entry.icon;
  return <Icon className={`h-5 w-5 shrink-0 ${entry.color}`} />;
}

function PanelHeader({ product, action }: { product: Product; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{product.name}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {SUBTITLES[product.key] ?? "Se abre aquí con tu sesión de OneSystec"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {action}
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          Activo
        </span>
      </div>
    </div>
  );
}

function OneTrackPanel({ product }: { product: Product }) {
  return (
    <>
      <PanelHeader product={product} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {ONETRACK_SHORTCUTS.map(({ to, label, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            onMouseMove={trackGlow}
            className="glow flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-slate-600 transition hover:border-blue-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-blue-400/50"
          >
            <Icon className={`h-6 w-6 ${color}`} />
            <span className="text-[15px]">{label}</span>
          </Link>
        ))}
      </div>
      <div className="mt-4 h-[28rem] overflow-hidden rounded-2xl border border-slate-200 sm:h-[34rem] dark:border-white/10">
        <DashboardPage />
      </div>
    </>
  );
}

/**
 * An external app, shown inside the workspace with the session already open (the same ticket
 * exchange as "open in a new tab"). Kept mounted but hidden while another app is in front.
 */
function ExternalPanel({ product, visible }: { product: Product; visible: boolean }) {
  const [ssoSrc, setSsoSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const fallback = product.url ?? null;

  useEffect(() => {
    if (!product.ssoEnabled) return;
    let cancelled = false;
    getProductSsoUrl(product.key)
      .then(({ url }) => !cancelled && setSsoSrc(url))
      // SSO not configured on one side: the app still loads, just asking for its own login.
      .catch(() => !cancelled && setSsoSrc(fallback));
    return () => {
      cancelled = true;
    };
  }, [product, fallback]);

  const src = product.ssoEnabled ? ssoSrc : fallback;

  return (
    <div className={visible ? "" : "hidden"}>
      <PanelHeader
        product={product}
        action={
          <button
            onClick={() => void openInNewTab(product)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            <ExternalLink className="h-4 w-4" /> Abrir en pestaña nueva
          </button>
        }
      />
      <div className="relative h-[calc(100vh-17rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            Entrando a {product.name}...
          </div>
        )}
        {src && (
          <iframe
            src={src}
            title={product.name}
            onLoad={() => setLoaded(true)}
            allow="geolocation; clipboard-write; fullscreen"
            className="h-full w-full bg-white"
          />
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">¿No carga o pide iniciar sesión? Ábrelo en una pestaña nueva.</p>
    </div>
  );
}

function ConfigPanel({ role }: { role: string | undefined }) {
  const manageTeam = role !== "viewer";
  const admin = role === "owner" || role === "admin";
  const items = useMemo(
    () =>
      [
        manageTeam && { to: "/equipo", label: "Equipo", hint: "Usuarios, roles y qué aplicaciones ve cada uno", icon: Users },
        admin && { to: "/ajustes", label: "Ajustes de OneTrack", hint: "Alertas, horarios y preferencias de la flota", icon: Settings },
        admin && { to: "/api-keys", label: "API Keys", hint: "Claves para integrar OneTrack con otros sistemas", icon: Key },
      ].filter(Boolean) as Array<{ to: string; label: string; hint: string; icon: LucideIcon }>,
    [manageTeam, admin],
  );

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Configuración</h1>
      <p className="mt-1 mb-4 text-sm text-slate-500 dark:text-slate-400">Administración de tu espacio de trabajo</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Tu cuenta no tiene opciones de configuración.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(({ to, label, hint, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onMouseMove={trackGlow}
              className="glow flex items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:shadow-md dark:border-white/10 dark:hover:border-blue-400/50"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                <span className="block text-[15px] font-medium text-slate-900 dark:text-white">{label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
