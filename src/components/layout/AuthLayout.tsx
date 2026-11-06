import { Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useTheme } from "../../context/ThemeContext";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen dark:bg-[#0a0e1a]">
      <div className="brand-gradient relative hidden w-1/2 flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-2">
          <img src="/logo.jpg" alt="OneSystec" className="h-9 w-9 rounded-2xl object-cover shadow-lg" />
          <span className="text-lg font-semibold">OneSystec</span>
        </div>

        <div className="relative">
          <img
            src="/logo.jpg"
            alt="OneSystec"
            className="mb-4 h-20 w-20 rounded-3xl object-cover shadow-xl shadow-black/20"
          />
          <h2 className="mb-2 text-2xl font-semibold">Monitoreo de flota en tiempo real</h2>
          <p className="max-w-sm text-sm text-sky-50">
            Ubicación, velocidad y estado de cada vehículo de tu empresa, todo en un solo lugar.
          </p>
        </div>

        <p className="relative text-xs text-sky-100">© {new Date().getFullYear()} OneSystec</p>
      </div>

      <div className="relative flex w-full items-center justify-center overflow-y-auto bg-[#f5f6fb] px-4 py-8 lg:w-1/2 dark:bg-[#0a0e1a]">
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"}
          className="absolute top-4 right-4 flex items-center rounded-xl p-2 text-slate-500 transition hover:bg-violet-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {children}
      </div>
    </div>
  );
}
