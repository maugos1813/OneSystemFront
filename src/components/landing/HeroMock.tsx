import { BellRing, MapPin } from "lucide-react";

const VEHICLES: Array<{ plate: string; state: string; color: string }> = [
  { plate: "AB 123 CD", state: "En movimiento", color: "#16a34a" },
  { plate: "EF 456 GH", state: "Encendido, detenido", color: "#f97316" },
  { plate: "IJ 789 KL", state: "Apagado", color: "#dc2626" },
];

/** Decorative stand-in for the product UI, drawn with made-up data on purpose: real
 * screenshots would show customers' actual plates and routes. */
export function HeroMock() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="brand-gradient absolute -inset-4 -z-10 rounded-[40px] opacity-25 blur-2xl" />

      <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-2xl shadow-blue-300/30 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/50">
        <div className="relative h-56 bg-[#e8eefb] dark:bg-[#0d1426]">
          <svg viewBox="0 0 400 224" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="route" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
              <pattern
                id="grid"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
                className="text-white dark:text-white/5"
              >
                <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="400" height="224" fill="url(#grid)" />
            <path d="M-10 170 C 80 150, 110 90, 190 100 S 320 40, 410 60" fill="none" stroke="#ffffff" strokeWidth="14" className="dark:stroke-white/10" />
            <path
              d="M-10 170 C 80 150, 110 90, 190 100 S 320 40, 410 60"
              fill="none"
              stroke="url(#route)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="2 9"
            />
            <circle cx="120" cy="118" r="26" fill="#7c3aed" fillOpacity="0.14" stroke="#7c3aed" strokeOpacity="0.6" strokeDasharray="4 4" />
          </svg>

          <span className="absolute top-[88px] left-[168px] flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg">
            <MapPin className="h-4 w-4 text-blue-600" />
          </span>
          <span className="absolute top-[40px] left-[290px] flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg">
            <MapPin className="h-4 w-4 text-green-600" />
          </span>
          <span className="absolute top-[128px] left-[60px] flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg">
            <MapPin className="h-4 w-4 text-orange-500" />
          </span>

          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-violet-700 shadow-md dark:bg-[#111729] dark:text-violet-300">
            <BellRing className="h-3 w-3" />
            Zona restringida: aviso al entrar
          </div>
        </div>

        <ul className="divide-y divide-slate-100 p-2 dark:divide-white/5">
          {VEHICLES.map((v) => (
            <li key={v.plate} className="flex items-center gap-3 px-3 py-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: v.color }} />
              <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">{v.plate}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{v.state}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
