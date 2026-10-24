import {
  Car,
  CircleUser,
  Cross,
  ExternalLink,
  Key,
  LogOut,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Moon,
  Settings,
  Sun,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AlertsPanel } from "../components/AlertsPanel";
import { useAuth } from "../context/AuthContext";
import { FleetProvider } from "../context/FleetContext";
import { useTheme } from "../context/ThemeContext";
import { getProductSsoUrl, listProducts } from "../lib/api";
import { trackGlow } from "../lib/glow";
import { firstAllowedPath } from "../lib/oneTrackNav";
import type { Product } from "../lib/types";
import { AppUpdateCard } from "../components/AppUpdateCard";
import { DashboardPage } from "./DashboardPage";
import { LandingPage } from "./LandingPage";

const CONFIG_KEY = "config";

/** The brand logo of each product, shown as its icon; a product without one falls back to a drawn icon. */
const PRODUCT_LOGOS: Record<string, string> = {
  gps: "/logos/onetrack-icon.png",
  driver: "/logos/gamonal-driver.png",
  farmacy: "/logos/gamonal-farmacy.png",
  nakamacar: "/logos/nakamacar.png",
};

/** Fallback icon and colour for a product that has no logo. */
const PRODUCT_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  gps: { icon: MapIcon, color: "text-blue-600 dark:text-blue-400" },
  driver: { icon: Truck, color: "text-slate-700 dark:text-slate-300" },
  farmacy: { icon: Cross, color: "text-emerald-600 dark:text-emerald-400" },
  nakamacar: { icon: Car, color: "text-slate-700 dark:text-slate-300" },
};

const SUBTITLES: Record<string, string> = {
  gps: "Seguimiento y control de rutas",
};

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

/**
 * The OneSystec shell: top bar, apps menu and the app in front. It is the parent of every OneTrack
 * route, so opening ("desplegar") OneTrack keeps this same page mounted and only folds the bars away.
 */
export function WorkspaceLayout() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  if (!isAuthenticated) return pathname === "/" ? <LandingPage /> : <Navigate to="/login" replace />;
  return <SignedInWorkspace />;
}

function SignedInWorkspace() {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  if (!products) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f6fb] text-sm text-slate-400 dark:bg-[#0a0e1a] dark:text-slate-500">
        Cargando...
      </div>
    );
  }

  const shell = <Workspace products={products} />;
  // The bell and OneTrack read the fleet, so only accounts with OneTrack load it.
  return products.some((p) => p.key === "gps") ? <FleetProvider>{shell}</FleetProvider> : shell;
}

function Workspace({ products }: { products: Product[] }) {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const hasOneTrack = products.some((p) => p.key === "gps");
  const atHome = pathname === "/";
  const selectedKey = params.get("app") ?? products[0]?.key ?? CONFIG_KEY;
  const selected = products.find((p) => p.key === selectedKey) ?? null;
  const showingConfig = selectedKey === CONFIG_KEY;
  const [visited, setVisited] = useState<string[]>([]);
  // The external app (by key) whose map is showing full screen: the whole window is for it, with no bars around.
  const [immersive, setImmersive] = useState<string | null>(null);

  // Away from "/" OneTrack's own pages are showing; for an external app the flag is in the address.
  const expanded = !atHome || (params.get("full") === "1" && selected?.type === "external") || immersive !== null;

  // External apps stay mounted once opened, so switching tabs doesn't throw away where you were.
  const select = (key: string) => {
    if (products.some((p) => p.key === key && p.type === "external")) {
      setVisited((current) => (current.includes(key) ? current : [...current, key]));
    }
    setImmersive(null);
    setParams({ app: key }, { replace: true });
  };
  const expand = () => {
    if (selected?.type === "external") return setParams({ app: selectedKey, full: "1" });
    // OneTrack opens on the first section this account may use (Mapa for most).
    const first = firstAllowedPath(currentUser);
    if (first) navigate(first);
  };
  const collapse = () => (atHome ? setParams({ app: selectedKey }) : navigate("/?app=gps"));

  // OneTrack's pages need its fleet; an account without it has nothing to show there.
  if (!atHome && !hasOneTrack) return <Navigate to="/" replace />;

  return (
    <div
      className={`flex h-screen flex-col overflow-hidden bg-[#f5f6fb] transition-all duration-300 dark:bg-[#0a0e1a] ${
        expanded ? "p-0" : "p-3 sm:p-4"
      }`}
    >
      {/* Clipped only while folded away: open, the bell's list and the account menu hang below the bar and sit above the panels. */}
      <div
        className={`relative z-30 shrink-0 transition-all duration-300 ${
          expanded ? "mb-0 max-h-0 overflow-hidden opacity-0" : "mb-3 max-h-28 sm:mb-4"
        }`}
      >
        <TopBar bell={hasOneTrack ? <AlertsPanel /> : null} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside
          className={`${PANEL} shrink-0 overflow-hidden transition-all duration-300 lg:w-72 ${
            expanded
              ? "mb-0 max-h-0 max-w-0 border-0 p-0 opacity-0 lg:mr-0"
              : "mb-3 max-h-96 p-3 sm:mb-4 lg:mr-4 lg:mb-0 lg:max-h-none lg:max-w-72"
          }`}
        >
          <p className="px-2 pt-1 pb-2 text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
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

        <main
          className={`${PANEL} flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 ${
            expanded ? "rounded-none border-0 shadow-none" : "p-4 sm:p-5"
          }`}
        >
          {/* OneTrack's own pages (map, history, vehicles...) — their layout fills this panel. */}
          <div className={atHome ? "hidden" : "min-h-0 flex-1"}>
            <Outlet context={{ collapse }} />
          </div>

          {atHome && showingConfig && <ConfigPanel role={currentUser?.role} />}
          {atHome && !showingConfig && selected?.type === "internal" && (
            <OneTrackHome product={selected} onExpand={expand} hasMap={!!currentUser?.modules.includes("mapa")} hasSections={!!firstAllowedPath(currentUser)} />
          )}
          {atHome && !showingConfig && !selected && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No tienes aplicaciones habilitadas todavía.</p>
          )}

          {products
            .filter((p) => p.type === "external" && (visited.includes(p.key) || (atHome && p.key === selectedKey)))
            .map((product) => (
              <ExternalPanel
                key={product.key}
                product={product}
                visible={atHome && product.key === selectedKey && !showingConfig}
                expanded={expanded}
                immersive={immersive === product.key}
                onImmersive={(on) => setImmersive(on ? product.key : null)}
                onToggle={expanded ? collapse : expand}
              />
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
  // Always the person (or client) who signed in, e.g. "Piazza Spedizioni"; the organization's name is only the fallback.
  const logo = currentUser?.userLogo ?? currentUser?.orgLogo ?? null;
  const title = currentUser?.name.trim() || currentUser?.orgName || "...";

  return (
    <header className={`${PANEL} flex items-center justify-between gap-3 px-4 py-3 sm:px-5`}>
      {/* The client using the app: their logo (or an initial until they upload one) and name. */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 max-w-40 min-w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-0.5 shadow-md shadow-blue-200/60 ring-1 ring-slate-200 dark:ring-white/10">
          {logo ? (
            <img src={logo} alt={title} className="h-full w-auto max-w-full object-contain" />
          ) : (
            <span className="brand-gradient flex aspect-square h-full items-center justify-center rounded-[0.85rem] text-lg font-bold text-white">
              {(title.trim().charAt(0) || "·").toUpperCase()}
            </span>
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">Business Workspace</p>
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-1">
        <img src="/logo.jpg" alt="OneSystec" title="OneSystec" className="mr-1 h-9 w-9 shrink-0 rounded-xl object-cover shadow-md shadow-blue-200/60" />
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

/** A logo on a white tile, so logos with a transparent background read in dark mode too. */
function ProductLogo({ product, size }: { product: Product; size: "sm" | "lg" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:ring-white/10 ${
        size === "sm" ? "h-8 w-8 p-0.5" : "h-14 w-14 p-1"
      }`}
    >
      <img src={PRODUCT_LOGOS[product.key]} alt="" className="max-h-full max-w-full object-contain" />
    </span>
  );
}

function ProductIcon({ product }: { product: Product }) {
  if (PRODUCT_LOGOS[product.key]) return <ProductLogo product={product} size="sm" />;
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

function ExpandButton({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  const Icon = expanded ? Minimize2 : Maximize2;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
    >
      <Icon className="h-4 w-4" /> {expanded ? "Contraer" : "Desplegar"}
    </button>
  );
}

function PanelHeader({
  product,
  expanded = false,
  onToggle,
  hideToggle = false,
  action,
}: {
  product: Product;
  expanded?: boolean;
  onToggle: () => void;
  hideToggle?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${expanded ? "px-4 py-2" : "mb-4"}`}>
      <div className="flex flex-wrap items-center gap-3">
        {PRODUCT_LOGOS[product.key] && <ProductLogo product={product} size={expanded ? "sm" : "lg"} />}
        <div>
          <h1 className={`font-semibold text-slate-900 dark:text-white ${expanded ? "text-lg" : "text-2xl"}`}>{product.name}</h1>
          {!expanded && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {SUBTITLES[product.key] ?? "Se abre aquí con tu sesión de OneSystec"}
            </p>
          )}
        </div>
        {!hideToggle && <ExpandButton expanded={expanded} onClick={onToggle} />}
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

function OneTrackHome({
  product,
  onExpand,
  hasMap,
  hasSections,
}: {
  product: Product;
  onExpand: () => void;
  hasMap: boolean;
  hasSections: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {hasSections ? (
        <PanelHeader product={product} onToggle={onExpand} />
      ) : (
        <PanelHeader product={product} onToggle={() => undefined} hideToggle />
      )}
      {hasMap ? (
        <div className="min-h-[24rem] flex-1 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
          <DashboardPage />
        </div>
      ) : (
        <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400">
          {hasSections
            ? "Pulsa Desplegar para ver las secciones que tienes habilitadas."
            : "Tu cuenta todavía no tiene secciones de OneTrack habilitadas. Pídele a tu administrador que las active."}
        </p>
      )}
    </div>
  );
}

/**
 * An external app, shown inside the workspace with the session already open (the same ticket
 * exchange as "open in a new tab"). Kept mounted but hidden while another app is in front.
 */
function ExternalPanel({
  product,
  visible,
  expanded,
  immersive,
  onImmersive,
  onToggle,
}: {
  product: Product;
  visible: boolean;
  expanded: boolean;
  /** The app's own map is full screen: this panel gives up its header so the map gets the whole screen. */
  immersive: boolean;
  onImmersive: (on: boolean) => void;
  onToggle: () => void;
}) {
  const [ssoSrc, setSsoSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const native = Capacitor.isNativePlatform();
  const frame = useRef<HTMLIFrameElement>(null);

  // Gamonal Driver tells us when one of its maps goes full screen. Only its own frame and its own address are believed.
  useEffect(() => {
    if (!product.url) return;
    const origin = new URL(product.url).origin;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data as { source?: string; type?: string; value?: unknown } | null;
      if (data?.source === "gamonal-driver" && data.type === "fullscreen") onImmersive(data.value === true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [product.url, onImmersive]);
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
    <div className={visible ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
      {!immersive && (
      <PanelHeader
        product={product}
        expanded={expanded}
        onToggle={onToggle}
        action={
          // Inside the Android app, and on a phone, everything opens in place: a second tab has no place there.
          native ? undefined : (
            <button
              onClick={() => void openInNewTab(product)}
              className="hidden items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 sm:flex dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <ExternalLink className="h-4 w-4" /> Abrir en pestaña nueva
            </button>
          )
        }
      />
      )}
      <div
        className={`relative min-h-[20rem] flex-1 overflow-hidden border-slate-200 dark:border-white/10 ${
          immersive ? "" : expanded ? "border-t" : "rounded-2xl border"
        }`}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            Entrando a {product.name}...
          </div>
        )}
        {src && (
          <iframe
            ref={frame}
            src={src}
            title={product.name}
            onLoad={() => setLoaded(true)}
            allow="geolocation; clipboard-write; fullscreen"
            className="h-full w-full bg-white"
          />
        )}
      </div>
      {!expanded && !native && (
        <p className="mt-2 hidden text-xs text-slate-400 sm:block dark:text-slate-500">¿No carga o pide iniciar sesión? Ábrelo en una pestaña nueva.</p>
      )}
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
    <div className="min-h-0 flex-1 overflow-auto">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Configuración</h1>
      <p className="mt-1 mb-4 text-sm text-slate-500 dark:text-slate-400">Administración de tu espacio de trabajo</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <AppUpdateCard />
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
    </div>
  );
}
