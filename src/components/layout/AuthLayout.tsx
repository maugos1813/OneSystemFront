import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-violet-500 to-purple-700 p-10 text-white lg:flex">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="OneSystem" className="h-9 w-9 rounded-xl object-cover" />
          <span className="text-lg font-semibold">OneSystem</span>
        </div>

        <div>
          <img src="/logo.jpg" alt="OneSystem" className="mb-4 h-20 w-20 rounded-2xl object-cover shadow-lg" />
          <h2 className="mb-2 text-2xl font-semibold">Monitoreo de flota en tiempo real</h2>
          <p className="max-w-sm text-sm text-violet-100">
            Ubicación, velocidad y estado de cada vehículo de tu empresa, todo en un solo lugar.
          </p>
        </div>

        <p className="text-xs text-violet-200">© {new Date().getFullYear()} OneSystem</p>
      </div>

      <div className="flex w-full items-center justify-center overflow-y-auto bg-violet-50 px-4 py-8 lg:w-1/2">
        {children}
      </div>
    </div>
  );
}
