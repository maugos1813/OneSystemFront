import { ArrowLeft, Building2, ChevronDown, ChevronRight, ImagePlus, Map as MapIcon, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Panel } from "../components/analytics/Panel";
import { ClientBeacons } from "../components/ClientBeacons";
import { LogoUpload } from "../components/LogoUpload";
import { PasswordField } from "../components/PasswordField";
import { useAuth } from "../context/AuthContext";
import { useLanguage, type MessageKey } from "../i18n";
import { ApiError, claimDevice, createPlatformOrganization, getPlatformOrganization, listPlatformOrganizations, resetPlatformUserTotp, setOrganizationLogoAsPlatform, setOrganizationSections, setUserLogoAsPlatform, viewClientToken } from "../lib/api";
import { startViewing } from "../lib/auth";
import { fileToLogoVariants, LOGO_ACCEPT } from "../lib/logoImage";
import { ADMIN_SECTION_INFO, ADMIN_SECTION_KEYS, HIDDEN_MODULES, MODULE_INFO, MODULE_KEYS } from "../lib/modules";
import { DEVICE_MODELS } from "../lib/deviceModels";
import type { PlatformOrganization, PlatformOrganizationDetail } from "../lib/types";

const INPUT =
  "field-input min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white";

/** The whole platform seen from above: every client organization. Only OneSystec's own owner/admin gets here (the server enforces it). */
export function PlatformPage({ embedded = false }: { embedded?: boolean }) {
  const { t, locale } = useLanguage();
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const dateTimeFormat = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });
  const { currentUser } = useAuth();
  const [orgs, setOrgs] = useState<PlatformOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlatformOrganizationDetail | null>(null);

  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  async function refetch() {
    try {
      setOrgs(await listPlatformOrganizations());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platform.err.list"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser?.isPlatform) void refetch();
  }, [currentUser?.isPlatform]);

  async function toggle(id: string) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setClaimMessage(null);
    try {
      const loaded = await getPlatformOrganization(id);
      setDetail(loaded);
      setAllowed(loaded.sections);
      setSectionsMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platform.err.client"));
    }
  }

  const [claimImei, setClaimImei] = useState("");
  const [claimModel, setClaimModel] = useState<string>(DEVICE_MODELS[0]);
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<{ ok: boolean; text: string } | null>(null);

  /** Hardware is OneSystec's: it assigns each device to the client that asked for it. */
  // What this client may have, as being edited: null = no limit (everything).
  const [allowed, setAllowed] = useState<string[] | null>(null);
  const [savingSections, setSavingSections] = useState(false);
  const [sectionsMessage, setSectionsMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveSections(orgId: string) {
    setSavingSections(true);
    setSectionsMessage(null);
    try {
      const saved = await setOrganizationSections(orgId, allowed);
      setAllowed(saved.sections);
      setDetail(await getPlatformOrganization(orgId));
      setSectionsMessage({ ok: true, text: t("platform.sectionsSaved") });
    } catch (err) {
      setSectionsMessage({ ok: false, text: err instanceof Error ? err.message : t("platform.err.save") });
    } finally {
      setSavingSections(false);
    }
  }

  const [logoError, setLogoError] = useState<string | null>(null);

  /** The company logo of a client, shown in its top bar (a user's own photo, if it has one, takes its place for that user). */
  async function changeOrgLogo(orgId: string, logo: string | null, tag: string | null = null) {
    setLogoError(null);
    try {
      await setOrganizationLogoAsPlatform(orgId, logo, tag);
      setDetail(await getPlatformOrganization(orgId));
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : t("platform.err.logo"));
    }
  }

  const [photoBusy, setPhotoBusy] = useState<string | null>(null);

  /** The photo of one of a client's users (the account holder's above all): OneSystec gives each client its identity. */
  async function changePhoto(userId: string, orgId: string, file: File | null) {
    setPhotoBusy(userId);
    try {
      if (file) {
        // The small copy is what the map draws on the plates when this account is a fleet.
        const { logo, tag } = await fileToLogoVariants(file);
        await setUserLogoAsPlatform(userId, logo, tag);
      } else {
        await setUserLogoAsPlatform(userId, null);
      }
      setDetail(await getPlatformOrganization(orgId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platform.err.photo"));
    } finally {
      setPhotoBusy(null);
    }
  }

  /** A person lost their phone (and their recovery codes): their authenticator is removed and they are signed out everywhere. */
  async function resetTotp(userId: string, orgId: string, who: string) {
    if (!confirm(t("platform.confirmReset", { who }))) return;
    setPhotoBusy(userId);
    try {
      await resetPlatformUserTotp(userId);
      setDetail(await getPlatformOrganization(orgId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platform.err.reset"));
    } finally {
      setPhotoBusy(null);
    }
  }

  const [openingId, setOpeningId] = useState<string | null>(null);

  /** One click to the client's map: a read-only token for that organization, then the app reloads on it. */
  async function viewMap(id: string) {
    setOpeningId(id);
    try {
      const { token } = await viewClientToken(id);
      startViewing(token);
      window.location.assign("/gps");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platform.err.open"));
      setOpeningId(null);
    }
  }

  async function handleClaim(e: FormEvent, orgId: string) {
    e.preventDefault();
    setClaiming(true);
    setClaimMessage(null);
    try {
      await claimDevice(claimImei.trim(), claimModel, orgId);
      setClaimImei("");
      setClaimMessage({ ok: true, text: t("platform.deviceAdded") });
      setDetail(await getPlatformOrganization(orgId));
      await refetch();
    } catch (err) {
      setClaimMessage({
        ok: false,
        text:
          err instanceof ApiError && err.status === 400
            ? err.message
            : err instanceof ApiError && err.status === 404
              ? t("platform.imeiTaken")
              : t("platform.err.addDevice"),
      });
    } finally {
      setClaiming(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreated(null);
    try {
      await createPlatformOrganization({ orgName: orgName.trim(), email: email.trim(), password });
      setCreated(orgName.trim());
      setOrgName("");
      setEmail("");
      setPassword("");
      await refetch();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t("platform.err.create"));
    } finally {
      setCreating(false);
    }
  }

  // Not OneSystec: this page doesn't exist for them (the server refuses the data anyway).
  if (currentUser && !currentUser.isPlatform) return <Navigate to="/" replace />;

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] dark:bg-[#0a0e1a]">
      {!embedded && (
        <header className="border-b border-violet-100 bg-white px-4 py-4 sm:px-8 dark:border-white/5 dark:bg-[#0d1220]">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("platform.back")}
          </Link>
        </header>
      )}

      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("platform.title")}</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          {t("platform.intro")}
        </p>

        <div className="space-y-6">
          <Panel title={t("platform.createTitle")}>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  required
                  minLength={2}
                  placeholder={t("platform.orgPlaceholder")}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className={INPUT}
                />
                <input
                  type="email"
                  required
                  placeholder={t("platform.ownerEmail")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT}
                />
                <PasswordField
                  required
                  minLength={8}
                  placeholder={t("platform.passwordPlaceholder")}
                  value={password}
                  onChange={setPassword}
                  className="min-w-0 flex-1"
                  inputClassName="rounded-xl px-3 py-2"
                />
              </div>
              {createError && <p className="text-xs text-red-600 dark:text-red-400">{createError}</p>}
              {created && <p className="text-xs text-emerald-600 dark:text-emerald-400">{t("platform.created", { name: created })}</p>}
              <button type="submit" disabled={creating} className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60">
                {creating ? t("platform.creating") : t("platform.createButton")}
              </button>
            </form>
          </Panel>

          <Panel title={t("platform.clients", { count: orgs.length })}>
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</p>
            ) : error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-white/10">
                {orgs.map((org) => (
                  <li key={org.id}>
                    <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void toggle(org.id)}
                      className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 py-3 text-left"
                    >
                      {openId === org.id ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                      <Building2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-900 dark:text-white">
                        {org.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {t("platform.orgSummary", { users: org.users, vehicles: org.vehicles, devices: org.devices })}
                      </span>
                      <span className="w-40 text-right text-xs text-slate-500 dark:text-slate-400">
                        {org.lastDeviceSeenAt ? t("platform.lastData", { when: dateTimeFormat.format(new Date(org.lastDeviceSeenAt)) }) : t("platform.noData")}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void viewMap(org.id)}
                      disabled={openingId === org.id}
                      className="brand-button flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                    >
                      <MapIcon className="h-3.5 w-3.5" />
                      {openingId === org.id ? t("platform.opening") : t("platform.viewMap")}
                    </button>
                    </div>

                    {openId === org.id && (
                      <div className="mb-3 ml-8 space-y-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5">
                        {!detail ? (
                          <p className="text-slate-500 dark:text-slate-400">{t("common.loading")}</p>
                        ) : (
                          <>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {t("platform.since", { date: dateFormat.format(new Date(detail.createdAt)), plan: detail.plan, id: detail.id })}
                            </p>
                            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                              <p className="mb-2 font-medium text-slate-700 dark:text-slate-300">{t("platform.clientLogo")}</p>
                              <LogoUpload value={detail.logo} onChange={(logo, tag) => void changeOrgLogo(detail.id, logo, tag ?? null)} name={detail.name} />
                              {logoError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{logoError}</p>}
                              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                {t("platform.clientLogoHint")}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium text-slate-700 dark:text-slate-300">{t("platform.views")}</p>
                                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={allowed === null}
                                    onChange={(e) =>
                                      setAllowed(e.target.checked ? null : [...MODULE_KEYS.filter((k) => !HIDDEN_MODULES.includes(k)), ...ADMIN_SECTION_KEYS])
                                    }
                                  />
                                  {t("platform.noLimit")}
                                </label>
                              </div>
                              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                                {t("platform.viewsHint")}
                              </p>
                              <div className={`grid gap-x-4 gap-y-1 sm:grid-cols-2 ${allowed === null ? "pointer-events-none opacity-50" : ""}`}>
                                {[
                                  ...MODULE_KEYS.filter((k) => !HIDDEN_MODULES.includes(k)).map((k) => [k, t(MODULE_INFO[k].label), t(MODULE_INFO[k].hint)] as const),
                                  ...ADMIN_SECTION_KEYS.map((k) => [k, t(ADMIN_SECTION_INFO[k].label), t(ADMIN_SECTION_INFO[k].hint)] as const),
                                ].map(([key, label, hint]) => (
                                  <label key={key} className="flex items-start gap-2 py-0.5">
                                    <input
                                      type="checkbox"
                                      className="mt-1"
                                      checked={allowed === null || allowed.includes(key)}
                                      onChange={(e) =>
                                        setAllowed((current) => {
                                          const base = current ?? [];
                                          return e.target.checked ? [...base, key] : base.filter((k) => k !== key);
                                        })
                                      }
                                    />
                                    <span>
                                      <span className="block text-slate-700 dark:text-slate-300">{label}</span>
                                      <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
                                    </span>
                                  </label>
                                ))}
                              </div>
                              <div className="mt-3 flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => void saveSections(detail.id)}
                                  disabled={savingSections || JSON.stringify(allowed === null ? null : [...allowed].sort()) === JSON.stringify(detail.sections === null ? null : [...detail.sections].sort())}
                                  className="brand-button rounded-xl px-4 py-1.5 text-xs font-medium disabled:opacity-50"
                                >
                                  {savingSections ? t("platform.saving") : t("platform.saveViews")}
                                </button>
                                {sectionsMessage && (
                                  <span className={`text-xs ${sectionsMessage.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                    {sectionsMessage.text}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="mb-1 font-medium text-slate-700 dark:text-slate-300">{t("platform.users")}</p>
                              <ul className="space-y-2">
                                {detail.members.map((member) => (
                                  <li key={member.id} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-0.5 ring-1 ring-slate-200 dark:ring-white/10">
                                      {member.logo ? (
                                        <img src={member.logo} alt="" className="max-h-full max-w-full object-contain" />
                                      ) : (
                                        <span className="brand-gradient flex h-full w-full items-center justify-center rounded-lg text-sm font-bold text-white">
                                          {(member.name || member.email).trim().charAt(0).toUpperCase()}
                                        </span>
                                      )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate">
                                        {member.name.trim() || "—"} · {t(`role.${member.role}` as MessageKey)}
                                        {member.allowedArea ? t("platform.inFleet", { area: member.allowedArea }) : ""}
                                        {member.totpEnabled && <ShieldCheck className="ml-1.5 inline h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-label={t("platform.twoStepOn")} />}
                                      </span>
                                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{member.email}</span>
                                    </span>
                                    <span className="flex shrink-0 gap-1">
                                      <label
                                        className={`flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10 ${photoBusy === member.id ? "pointer-events-none opacity-50" : ""}`}
                                      >
                                        <ImagePlus className="h-3.5 w-3.5" />
                                        {member.logo ? t("platform.changePhoto") : t("platform.uploadPhoto")}
                                        <input
                                          type="file"
                                          accept={LOGO_ACCEPT}
                                          className="hidden"
                                          onChange={(e) => {
                                            void changePhoto(member.id, detail.id, e.target.files?.[0] ?? null);
                                            e.target.value = "";
                                          }}
                                        />
                                      </label>
                                      {member.totpEnabled && (
                                        <button
                                          type="button"
                                          disabled={photoBusy === member.id}
                                          onClick={() => void resetTotp(member.id, detail.id, member.name.trim() || member.email)}
                                          aria-label={t("platform.removeTwoStep")}
                                          title={t("platform.removeTwoStepTitle")}
                                          className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50 dark:hover:bg-amber-500/10"
                                        >
                                          <ShieldOff className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      {member.logo && (
                                        <button
                                          type="button"
                                          disabled={photoBusy === member.id}
                                          onClick={() => void changePhoto(member.id, detail.id, null)}
                                          aria-label={t("platform.removePhoto")}
                                          title={t("platform.removePhoto")}
                                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <details className="group rounded-xl border border-slate-200 p-3 dark:border-white/10">
                              <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                                <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
                                {t("platform.devices", { count: detail.deviceList.length })}
                              </summary>
                              <div className="mt-2">
                              {detail.deviceList.length === 0 ? (
                                <p className="text-slate-500 dark:text-slate-400">{t("platform.noneM")}</p>
                              ) : (
                                <ul className="space-y-0.5">
                                  {detail.deviceList.map((device) => (
                                    <li key={device.id} className="text-slate-700 dark:text-slate-300">
                                      {device.imei} · {device.model} · {device.status}
                                      {device.vehicle ? ` · ${device.vehicle.plate ?? device.vehicle.name}` : ""}
                                      {device.lastSeenAt ? t("platform.seen", { when: dateTimeFormat.format(new Date(device.lastSeenAt)) }) : ""}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <form onSubmit={(e) => void handleClaim(e, detail.id)} className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <input
                                  type="text"
                                  required
                                  minLength={10}
                                  value={claimImei}
                                  onChange={(e) => setClaimImei(e.target.value)}
                                  placeholder={t("platform.imeiForClient")}
                                  aria-label={t("platform.imei")}
                                  className={INPUT}
                                />
                                <select
                                  value={claimModel}
                                  onChange={(e) => setClaimModel(e.target.value)}
                                  aria-label={t("platform.model")}
                                  className="field-input rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                                >
                                  {DEVICE_MODELS.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                                <button type="submit" disabled={claiming} className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60">
                                  {claiming ? t("platform.adding") : t("platform.addDevice")}
                                </button>
                              </form>
                              {claimMessage && (
                                <p className={`mt-1 text-xs ${claimMessage.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                  {claimMessage.text}
                                </p>
                              )}
                              </div>
                            </details>
                            <ClientBeacons key={detail.id} orgId={detail.id} />
                          </>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
