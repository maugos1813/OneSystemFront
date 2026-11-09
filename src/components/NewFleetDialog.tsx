import { ChevronRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useT } from "../i18n";
import { ApiError, createTeamMember, listProducts, setFleetVehicles } from "../lib/api";
import { MODULE_TEMPLATES, type ModuleKey } from "../lib/modules";
import { squash } from "../lib/vehicleStatus";
import type { Product, Vehicle } from "../lib/types";
import { ProductCheckboxes } from "../pages/TeamPage";
import { LanguageSelect } from "./LanguageSelect";
import { LogoUpload } from "./LogoUpload";
import { ModalPortal } from "./ModalPortal";
import { ModulesPicker } from "./ModulesPicker";
import { PasswordField } from "./PasswordField";

const FIELD = "field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white";
const LABEL = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";
const SECTION = "text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500";

/**
 * A fleet's login is never an owner or an admin: it sits under the main client (and so under OneSystec) and sees only its own fleet.
 * "Manager" is what lets it work normally there (register its vehicles and their maintenance, create its own users, never more
 * access than it has itself); the server pins everything it does to its fleet.
 */
const FLEET_ROLE = "manager";

/**
 * A new fleet, from the client that owns the account: the fleet's own login (its logo, name, administration e-mail…) and the
 * vehicles it has. Only the main client chooses a fleet's vehicles; the fleet's own account cannot move them (the server enforces it).
 */
export function NewFleetDialog({
  vehicles,
  onClose,
  onCreated,
}: {
  vehicles: Vehicle[];
  onClose: () => void;
  /** `vehiclesFailed`: the account was created but its vehicles could not be assigned. */
  onCreated: (fleet: string, vehiclesFailed: boolean) => void;
}) {
  const t = useT();
  const [fleet, setFleet] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [logoTag, setLogoTag] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [person, setPerson] = useState("");
  const [language, setLanguage] = useState<"es" | "it">("it");
  const [modules, setModules] = useState<ModuleKey[]>([...MODULE_TEMPLATES.estandar]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productKeys, setProductKeys] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    listProducts()
      .then((list) => {
        if (!alive) return;
        setProducts(list);
        setProductKeys(list.map((p) => p.key));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const fleetName = fleet.trim();
  const taken = fleetName !== "" && vehicles.some((v) => v.fleetGroup === fleetName);
  const visible = useMemo(() => {
    const q = squash(search);
    return vehicles
      .filter((v) => !q || squash(`${v.plate ?? ""} ${v.name}`).includes(q))
      .sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)) || (a.plate ?? a.name).localeCompare(b.plate ?? b.name));
  }, [vehicles, search, selected]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const setVisible = (on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      for (const v of visible) {
        if (on) next.add(v.id);
        else next.delete(v.id);
      }
      return next;
    });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (taken) return;
    setSaving(true);
    setError(null);
    try {
      await createTeamMember({
        name: person.trim() || fleetName,
        email: email.trim(),
        password,
        role: FLEET_ROLE,
        allowedArea: fleetName,
        ...(logo ? { logo, logoTag } : {}),
        language,
        modules,
        productKeys,
      });
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : t("team.err.invite"));
      setSaving(false);
      return;
    }
    let vehiclesFailed = false;
    if (selected.size > 0) {
      try {
        await setFleetVehicles(fleetName, [...selected]);
      } catch {
        vehiclesFailed = true;
      }
    }
    setSaving(false);
    onCreated(fleetName, vehiclesFailed);
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 text-left whitespace-normal sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={t("fleetNew.title")}
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <form
          onSubmit={(e) => void submit(e)}
          className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-white bg-white shadow-xl sm:rounded-2xl dark:border-white/10 dark:bg-[#111729]"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t("fleetNew.title")}</h2>
            <button type="button" onClick={onClose} aria-label={t("common.cancel")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="styled-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
            <section className="space-y-3">
              <div>
                <p className={`${SECTION} mb-2`}>
                  {t("fleetNew.logo")} <span className="font-normal normal-case">{t("fleetNew.logoHint")}</span>
                </p>
                <LogoUpload
                  value={logo}
                  onChange={(next, tag) => {
                    setLogo(next);
                    setLogoTag(tag ?? null);
                  }}
                  name={fleetName}
                />
              </div>
              <div>
                <label className={LABEL}>{t("fleetNew.name")}</label>
                <input
                  required
                  autoFocus
                  value={fleet}
                  onChange={(e) => setFleet(e.target.value.toUpperCase().slice(0, 50))}
                  placeholder={t("fleetNew.namePlaceholder")}
                  className={FIELD}
                />
                {taken && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t("fleetNew.nameTaken")}</p>}
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <p className={SECTION}>{t("fleetNew.account")}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("fleetNew.accountHint")}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>{t("fleetNew.email")}</label>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} autoComplete="off" />
                </div>
                <div>
                  <label className={LABEL}>Password</label>
                  <PasswordField
                    required
                    minLength={8}
                    placeholder={t("team.passwordPlaceholder")}
                    value={password}
                    onChange={setPassword}
                    inputClassName="rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className={LABEL}>
                    {t("fleetNew.person")} <span className="font-normal text-slate-400">{t("fleetNew.optional")}</span>
                  </label>
                  <input value={person} onChange={(e) => setPerson(e.target.value)} maxLength={100} className={FIELD} />
                </div>
                <div>
                  <label className={LABEL}>{t("team.language")}</label>
                  <LanguageSelect value={language} onChange={setLanguage} />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <p className={SECTION}>{t("fleetNew.vehicles")}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("fleetNew.vehiclesHint")}</p>
              </div>
              {vehicles.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("fleetNew.noVehicles")}</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-0 flex-1 basis-48">
                      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("fleetNew.search")} className={`${FIELD} pl-9`} />
                    </div>
                    <button type="button" onClick={() => setVisible(true)} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-white/10">
                      {t("fleetNew.selectAll")}
                    </button>
                    <button type="button" onClick={() => setVisible(false)} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10">
                      {t("fleetNew.selectNone")}
                    </button>
                  </div>
                  <ul className="styled-scrollbar max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-white/10 dark:border-white/10">
                    {visible.map((v) => (
                      <li key={v.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                          <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} className="brand-range h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-100">
                            {v.plate ?? v.name}
                            {v.plate && <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">{v.name}</span>}
                          </span>
                          {v.fleetGroup && selected.has(v.id) && (
                            <span className="shrink-0 text-xs text-amber-600 dark:text-amber-400">{t("fleetNew.vehicleMoves", { fleet: v.fleetGroup })}</span>
                          )}
                          {v.fleetGroup && !selected.has(v.id) && <span className="shrink-0 text-xs text-slate-400">{v.fleetGroup}</span>}
                        </label>
                      </li>
                    ))}
                    {visible.length === 0 && <li className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">{t("fleetNew.noMatch")}</li>}
                  </ul>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("fleetNew.selected", { count: selected.size })}</p>
                </>
              )}
            </section>

            <details className="group rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
                {t("fleetNew.advanced")}
              </summary>
              <div className="mt-3 space-y-4">
                <div>
                  <p className={`${SECTION} mb-2`}>{t("team.oneTrackSections")}</p>
                  <ModulesPicker selected={modules} onChange={setModules} />
                </div>
                {products.length > 0 && (
                  <div>
                    <p className={`${SECTION} mb-2`}>{t("team.cardsAccess")}</p>
                    <ProductCheckboxes products={products} selected={productKeys} onChange={setProductKeys} />
                  </div>
                )}
              </div>
            </details>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-white/10">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={saving || taken} className="brand-button rounded-xl px-5 py-2 text-sm font-medium disabled:opacity-50">
              {saving ? t("fleetNew.creating") : t("fleetNew.create")}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
