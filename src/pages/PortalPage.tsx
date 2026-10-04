import { LogOut, MapPin, Moon, Sun, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getProductSsoUrl, listProducts } from "../lib/api";
import { trackGlow } from "../lib/glow";
import type { Product } from "../lib/types";

/** Real brand logos for products that have one; the rest fall back to an icon badge. */
const PRODUCT_LOGOS: Record<string, string> = {
  driver: "/logos/gamonal-driver.png",
  farmacy: "/logos/gamonal-farmacy.png",
  nakamacar: "/logos/nakamacar.png",
};

/** Products whose logo already carries their name: it fills the whole card instead of
 * sitting in a small badge above a text label. */
const PRODUCT_CARD_IMAGES: Record<string, string> = {
  gps: "/logos/onetrack.png",
};

export function PortalPage() {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [ssoPending, setSsoPending] = useState<string | null>(null);

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  async function openProduct(product: Product) {
    if (product.type === "internal" && product.path) {
      navigate(product.path);
      return;
    }
    if (!product.url) return;

    if (!product.ssoEnabled) {
      window.open(product.url, "_blank", "noopener,noreferrer");
      return;
    }

    // Open the tab synchronously (still inside the click gesture, so popup blockers
    // allow it) and point it wherever the SSO exchange resolves to once it's ready —
    // this needs a real window handle, so it can't carry noopener/noreferrer.
    const tab = window.open("", "_blank");
    setSsoPending(product.key);
    try {
      const { url } = await getProductSsoUrl(product.key);
      if (tab) tab.location.href = url;
    } catch {
      // SSO not configured yet on one side or the other — fall back to its own login.
      if (tab) tab.location.href = product.url;
    } finally {
      setSsoPending(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6fb] transition-colors dark:bg-[#0a0e1a]">
      <header className="flex items-center justify-between gap-3 border-b border-violet-100 bg-white px-4 py-4 transition-colors sm:px-8 dark:border-white/5 dark:bg-[#0d1220]">
        <div className="flex min-w-0 items-center gap-2">
          <img
            src="/logo.jpg"
            alt="OneSystec"
            className="h-9 w-9 shrink-0 rounded-2xl object-cover shadow-md shadow-blue-200/60"
          />
          <span className="truncate text-lg font-semibold text-slate-900 dark:text-white">
            One<span className="brand-text-gradient">Systec</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {currentUser?.orgName ?? "..."}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {currentUser?.email}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"
            }
            className="flex items-center rounded-xl p-2 text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          {currentUser?.role !== "viewer" && (
            <Link
              to="/equipo"
              className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 sm:px-3 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Equipo</span>
            </Link>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 sm:px-3 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <p className="mb-2 text-xs font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
          Panel de control
        </p>
        <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">
          Elegí un sistema
        </h1>
        <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
          {products.length} sistema{products.length === 1 ? "" : "s"} disponible
          {products.length === 1 ? "" : "s"} para {currentUser?.orgName}
        </p>

        {loading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Cargando...
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const logo = PRODUCT_LOGOS[product.key];
              const cardImage = PRODUCT_CARD_IMAGES[product.key];
              const isPending = ssoPending === product.key;

              if (cardImage) {
                return (
                  <button
                    key={product.key}
                    onClick={() => openProduct(product)}
                    onMouseMove={trackGlow}
                    disabled={isPending}
                    aria-label={`Abrir ${product.name}`}
                    className="glow float-card group flex flex-col items-center overflow-hidden rounded-3xl border border-white bg-white pb-5 text-center shadow-lg shadow-slate-200/50 transition hover:shadow-xl disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:shadow-black/40"
                  >
                    <img
                      src={cardImage}
                      alt={product.name}
                      className="w-full transition duration-300 group-hover:scale-[1.02]"
                    />
                    <span className="brand-button -mt-1 rounded-xl px-4 py-2 text-xs font-medium">
                      Acceder Consola →
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={product.key}
                  onClick={() => openProduct(product)}
                  onMouseMove={trackGlow}
                  disabled={isPending}
                  className="glow float-card group flex flex-col items-center gap-4 rounded-3xl border border-white bg-white p-8 text-center shadow-lg shadow-slate-200/50 transition hover:shadow-xl disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
                >
                  {logo ? (
                    <div className="rounded-2xl p-2 transition group-hover:scale-105 dark:bg-white">
                      <img
                        src={logo}
                        alt={product.name}
                        className="h-16 w-auto max-w-[160px] object-contain"
                      />
                    </div>
                  ) : product.key === "gps" ? (
                    <div className="brand-gradient-soft flex h-20 w-20 items-center justify-center rounded-2xl transition group-hover:scale-105 dark:bg-blue-500/15">
                      <MapPin className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                  ) : (
                    <div className="brand-gradient-soft flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-blue-600 transition group-hover:scale-105 dark:bg-blue-500/15 dark:text-blue-400">
                      {product.name.charAt(0)}
                    </div>
                  )}
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {product.name}
                  </p>
                  <span className="brand-button -mt-1 rounded-xl px-4 py-2 text-xs font-medium">
                    Acceder Consola →
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-12 text-center text-xs text-slate-400 dark:text-slate-600">
          © {new Date().getFullYear()} OneSystec — {currentUser?.orgName}. Todos
          los derechos reservados.
        </p>
      </main>
    </div>
  );
}
