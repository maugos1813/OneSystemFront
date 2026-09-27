import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listProducts } from "../lib/api";
import { trackGlow } from "../lib/glow";
import type { Product } from "../lib/types";

/** Real brand logos for products that have one; the rest fall back to an initial badge. */
const PRODUCT_LOGOS: Record<string, string> = {
  driver: "/logos/gamonal-driver.png",
};

export function PortalPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  function openProduct(product: Product) {
    if (product.type === "internal" && product.path) {
      navigate(product.path);
    } else if (product.url) {
      window.open(product.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6fb]">
      <header className="flex items-center justify-between gap-3 border-b border-violet-100 bg-white px-4 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <img
            src="/logo.jpg"
            alt="OneSystec"
            className="h-9 w-9 shrink-0 rounded-2xl object-cover shadow-md shadow-blue-200/60"
          />
          <span className="truncate text-lg font-semibold text-slate-900">
            One<span className="brand-text-gradient">Systec</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-semibold text-slate-900">{currentUser?.orgName ?? "..."}</p>
            <p className="truncate text-xs text-slate-500">{currentUser?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 sm:px-3"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">Elegí un sistema</h1>
        <p className="mb-8 text-sm text-slate-500">{currentUser?.orgName}</p>

        {loading ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const logo = PRODUCT_LOGOS[product.key];
              return (
                <button
                  key={product.key}
                  onClick={() => openProduct(product)}
                  onMouseMove={trackGlow}
                  className="glow float-card group flex flex-col items-center gap-4 rounded-3xl border border-white bg-white p-8 text-center shadow-lg shadow-slate-200/50 transition hover:shadow-xl"
                >
                  {logo ? (
                    <img
                      src={logo}
                      alt={product.name}
                      className="h-20 w-20 object-contain transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="brand-gradient-soft flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-blue-600">
                      {product.name.charAt(0)}
                    </div>
                  )}
                  <p className="text-lg font-semibold text-slate-900">{product.name}</p>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
