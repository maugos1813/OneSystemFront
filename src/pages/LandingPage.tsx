import { ArrowRight, Mail, Smartphone } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { HeroMock } from "../components/landing/HeroMock";
import { LandingNav } from "../components/landing/LandingNav";
import { trackGlow } from "../lib/glow";
import { ACCESS_STEPS, CONTACT_EMAIL, LANDING_APPS, ONETRACK_FEATURES } from "../lib/landingContent";

const SECTION = "mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20";
const CARD =
  "glow float-card rounded-3xl border border-white bg-white shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40";

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="mb-2 text-xs font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">{eyebrow}</p>
      <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">{title}</h2>
      {description && <p className="mt-3 text-slate-600 dark:text-slate-400">{description}</p>}
    </div>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl dark:bg-blue-500/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-500/10"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
        <div>
          <p className="mb-4 text-xs font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
            Tecnología, innovación e integración
          </p>
          <h1 className="text-4xl leading-tight font-bold text-slate-900 sm:text-5xl dark:text-white">
            Toda tu operación, <span className="brand-text-gradient">en un solo sistema</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600 dark:text-slate-400">
            OneSystec reúne las aplicaciones que tu empresa necesita para controlar su flota y su logística, con un único
            acceso para todo el equipo.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/login" className="brand-button inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium">
              Iniciar sesión
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#apps"
              className="rounded-xl px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-white dark:text-slate-200 dark:hover:bg-white/5"
            >
              Conocer las apps
            </a>
          </div>
        </div>

        <HeroMock />
      </div>
    </section>
  );
}

function AppsSection() {
  return (
    <section id="apps" className={SECTION}>
      <SectionHeading
        eyebrow="Apps"
        title="Un portal, varias soluciones"
        description="Cada empresa activa las aplicaciones que necesita y entra a todas desde el mismo lugar."
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {LANDING_APPS.map((app) => (
          <div key={app.key} onMouseMove={trackGlow} className={`${CARD} flex flex-col items-center gap-3 p-6 text-center`}>
            <div className="flex h-20 w-44 items-center justify-center rounded-2xl p-2 dark:bg-white">
              <img src={app.logo} alt="" className="max-h-full max-w-full object-contain" />
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{app.name}</p>
            <span className="rounded-full bg-violet-100 px-3 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              {app.tagline}
            </span>
            <p className="text-sm text-slate-600 dark:text-slate-400">{app.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function OneTrackSection() {
  return (
    <section id="onetrack" className={SECTION}>
      <SectionHeading
        eyebrow="OneTrack"
        title="Tu flota, bajo control"
        description="Una plataforma de rastreo pensada para operaciones de transporte: sabes dónde está cada vehículo, cómo se usa y cuándo algo sale de lo esperado."
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {ONETRACK_FEATURES.map(({ title, description, icon: Icon }) => (
          <div key={title} onMouseMove={trackGlow} className={`${CARD} p-6`}>
            <div className="brand-gradient-soft mb-4 flex h-11 w-11 items-center justify-center rounded-2xl dark:bg-blue-500/15">
              <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="mb-1.5 font-semibold text-slate-900 dark:text-white">{title}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AccessSection() {
  return (
    <section id="acceso" className={SECTION}>
      <SectionHeading
        eyebrow="Cómo funciona"
        title="Un solo acceso para todo el equipo"
        description="Inicias sesión una vez en OneSystec y entras a tus apps sin volver a ingresar tus datos. Cada persona ve solo lo que se le asigna."
      />
      <ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {ACCESS_STEPS.map((step, index) => (
          <li key={step.title} onMouseMove={trackGlow} className={`${CARD} flex gap-4 p-6`}>
            <span className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white">
              {index + 1}
            </span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{step.title}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function NativeAppsSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
      <div className="brand-gradient relative overflow-hidden rounded-3xl p-8 text-white sm:p-10">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Smartphone className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium">Próximamente</span>
            <h2 className="text-xl font-bold sm:text-2xl">Apps nativas para el celular</h2>
            <p className="mt-1 max-w-xl text-sm text-sky-50">
              Estamos preparando versiones nativas de cada aplicación para que tu equipo en campo tenga una experiencia
              más rápida y cómoda en el teléfono.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section id="contacto" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6">
      <div onMouseMove={trackGlow} className={`${CARD} flex flex-col items-center gap-4 p-10 text-center`}>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">¿Ya eres cliente?</h2>
        <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
          Entra a tu panel para abrir tus aplicaciones.{CONTACT_EMAIL ? " Si aún no tienes cuenta, escríbenos." : ""}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/login" className="brand-button rounded-xl px-6 py-3 text-sm font-medium">
            Iniciar sesión
          </Link>
          {CONTACT_EMAIL && (
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <Mail className="h-4 w-4" />
              {CONTACT_EMAIL}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-violet-100 bg-white px-4 py-8 dark:border-white/5 dark:bg-[#0d1220]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row dark:text-slate-400">
        <span className="flex items-center gap-2">
          <img src="/logo.jpg" alt="" className="h-6 w-6 rounded-lg object-cover" />© {new Date().getFullYear()} OneSystec.
          Todos los derechos reservados.
        </span>
        <Link to="/login" className="font-medium hover:text-slate-900 dark:hover:text-white">
          Iniciar sesión
        </Link>
      </div>
    </footer>
  );
}

export function LandingPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = "OneSystec — Tecnología, innovación e integración";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f6fb] dark:bg-[#0a0e1a]">
      <LandingNav />
      <main>
        <Hero />
        <AppsSection />
        <OneTrackSection />
        <AccessSection />
        <NativeAppsSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
