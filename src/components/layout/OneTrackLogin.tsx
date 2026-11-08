import { useT } from "../../i18n";
import { LoginCard } from "./LoginCard";

/** Faint grid of dots, like the map's: drawn in CSS so the app has no picture to download. */
const DOTS = "radial-gradient(circle, rgba(125, 211, 252, 0.28) 1px, transparent 1.5px)";

/**
 * The OneTrack app's sign-in: OneTrack's own symbol and name above the form (a glass card over a deep-blue night with a radar
 * glow behind the logo) and the signature of who made it at the foot.
 */
export function OneTrackLogin({ onSubmit }: { onSubmit: (email: string, password: string) => Promise<void> }) {
  const t = useT();
  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden overflow-y-auto bg-[#050d2e] px-[8%] pt-[max(env(safe-area-inset-top),2rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:px-6">
      {/* The night: a violet and a cyan glow, a fading grid of dots, and the radar rings behind the symbol. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 45% at 50% 12%, rgba(59,130,246,0.38), transparent 70%), radial-gradient(ellipse 70% 40% at 85% 95%, rgba(124,58,237,0.42), transparent 70%), radial-gradient(ellipse 60% 35% at 5% 70%, rgba(56,189,248,0.18), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: DOTS,
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 90% 60% at 50% 25%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 60% at 50% 25%, black, transparent 75%)",
        }}
      />

      <header className="relative flex w-full max-w-md flex-col items-center pt-2 text-center sm:pt-6">
        <div className="relative flex h-32 w-32 items-center justify-center sm:h-40 sm:w-40">
          <span aria-hidden className="absolute inset-0 rounded-full border border-sky-300/25" />
          <span aria-hidden className="absolute -inset-5 rounded-full border border-sky-300/15" />
          <span aria-hidden className="absolute -inset-10 rounded-full border border-sky-300/10" />
          <img src="/logos/onetrack-symbol.png" alt="OneTrack" className="relative h-24 w-auto drop-shadow-[0_0_24px_rgba(56,189,248,0.55)] sm:h-28" />
        </div>
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
          One<span className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">Track</span>
        </h2>
        <p className="mt-1 text-sm text-sky-100/80">{t("login.onetrackTagline")}</p>
      </header>

      <div className="relative flex w-full max-w-md flex-1 items-center py-6 sm:py-8">
        <div className="w-full">
          <LoginCard onSubmit={onSubmit} />
        </div>
      </div>

      <footer className="relative flex items-center gap-2 text-xs text-sky-100/70">
        <img src="/logo.jpg" alt="" className="h-5 w-5 rounded object-cover" />
        <span>
          created by <span className="font-semibold tracking-wide text-white">ONE SYSTEC</span>
        </span>
      </footer>
    </main>
  );
}
