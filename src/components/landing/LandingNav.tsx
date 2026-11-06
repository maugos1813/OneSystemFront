import { Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { CONTACT_EMAIL } from "../../lib/landingContent";

const LINKS: Array<{ href: string; label: string }> = [
  { href: "#apps", label: "Apps" },
  { href: "#onetrack", label: "OneTrack" },
  { href: "#acceso", label: "Cómo funciona" },
  ...(CONTACT_EMAIL ? [{ href: "#contacto", label: "Contacto" }] : []),
];

export function LandingNav() {
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-violet-100/70 bg-white/80 backdrop-blur-md dark:border-white/5 dark:bg-[#0a0e1a]/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a href="#top" className="flex min-w-0 items-center gap-2" aria-label="OneSystec — inicio">
          <img
            src="/logo.jpg"
            alt=""
            className="h-9 w-9 shrink-0 rounded-2xl object-cover shadow-md shadow-blue-200/60"
          />
          <span className="truncate text-lg font-semibold text-slate-900 dark:text-white">
            One<span className="brand-text-gradient">Systec</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-violet-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"}
            className="flex items-center rounded-xl p-2 text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link to="/login" className="brand-button rounded-xl px-4 py-2 text-sm font-medium">
            Iniciar sesión
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            className="flex items-center rounded-xl p-2 text-slate-500 transition hover:bg-violet-50 md:hidden dark:text-slate-400 dark:hover:bg-white/5"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-violet-100/70 px-4 py-2 md:hidden dark:border-white/5" aria-label="Principal móvil">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-white/5"
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
