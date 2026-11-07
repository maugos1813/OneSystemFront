import { ArrowLeft, Building2, ChevronDown, ChevronRight, Map as MapIcon } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Panel } from "../components/analytics/Panel";
import { PasswordField } from "../components/PasswordField";
import { useAuth } from "../context/AuthContext";
import { ApiError, claimDevice, createPlatformOrganization, getPlatformOrganization, listPlatformOrganizations, viewClientToken } from "../lib/api";
import { startViewing } from "../lib/auth";
import { DEVICE_MODELS } from "../lib/deviceModels";
import type { PlatformOrganization, PlatformOrganizationDetail } from "../lib/types";

const dateFormat = new Intl.DateTimeFormat("es", { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" });

const INPUT =
  "field-input min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white";

/** The whole platform seen from above: every client organization. Only OneSystec's own owner/admin gets here (the server enforces it). */
export function PlatformPage({ embedded = false }: { embedded?: boolean }) {
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
      setError(err instanceof Error ? err.message : "No se pudo cargar la lista");
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
      setDetail(await getPlatformOrganization(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el cliente");
    }
  }

  const [claimImei, setClaimImei] = useState("");
  const [claimModel, setClaimModel] = useState<string>(DEVICE_MODELS[0]);
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<{ ok: boolean; text: string } | null>(null);

  /** Hardware is OneSystec's: it assigns each device to the client that asked for it. */
  const [openingId, setOpeningId] = useState<string | null>(null);

  /** One click to the client's map: a read-only token for that organization, then the app reloads on it. */
  async function viewMap(id: string) {
    setOpeningId(id);
    try {
      const { token } = await viewClientToken(id);
      startViewing(token);
      window.location.assign("/gps");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la cuenta del cliente");
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
      setClaimMessage({ ok: true, text: "Dispositivo agregado." });
      setDetail(await getPlatformOrganization(orgId));
      await refetch();
    } catch (err) {
      setClaimMessage({
        ok: false,
        text:
          err instanceof ApiError && err.status === 400
            ? err.message
            : err instanceof ApiError && err.status === 404
              ? "Ese IMEI ya está vinculado a otra empresa (o no existe)."
              : "No se pudo agregar el dispositivo",
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
      setCreateError(err instanceof Error ? err.message : "No se pudo crear el cliente");
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
            Volver al portal
          </Link>
        </header>
      )}

      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Clientes</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Todos los clientes de la plataforma: crea los que necesites y gestiona sus dispositivos. Solo OneSystec ve esta sección; cada cliente administra su propio Equipo y solo ve lo suyo.
        </p>

        <div className="space-y-6">
          <Panel title="Dar de alta un cliente">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  required
                  minLength={2}
                  placeholder="Nombre del cliente (empresa)"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className={INPUT}
                />
                <input
                  type="email"
                  required
                  placeholder="Email de su primer usuario (owner)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT}
                />
                <PasswordField
                  required
                  minLength={8}
                  placeholder="Contraseña (mínimo 8 caracteres)"
                  value={password}
                  onChange={setPassword}
                  className="min-w-0 flex-1"
                  inputClassName="rounded-xl px-3 py-2"
                />
              </div>
              {createError && <p className="text-xs text-red-600 dark:text-red-400">{createError}</p>}
              {created && <p className="text-xs text-emerald-600 dark:text-emerald-400">Cliente «{created}» creado.</p>}
              <button type="submit" disabled={creating} className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60">
                {creating ? "Creando..." : "Crear cliente"}
              </button>
            </form>
          </Panel>

          <Panel title={`Clientes (${orgs.length})`}>
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>
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
                        {org.users} usuarios · {org.vehicles} vehículos · {org.devices} dispositivos
                      </span>
                      <span className="w-40 text-right text-xs text-slate-500 dark:text-slate-400">
                        {org.lastDeviceSeenAt ? `Último dato: ${dateTimeFormat.format(new Date(org.lastDeviceSeenAt))}` : "Sin datos"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void viewMap(org.id)}
                      disabled={openingId === org.id}
                      className="brand-button flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                    >
                      <MapIcon className="h-3.5 w-3.5" />
                      {openingId === org.id ? "Abriendo..." : "Ver mapa"}
                    </button>
                    </div>

                    {openId === org.id && (
                      <div className="mb-3 ml-8 space-y-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-white/5">
                        {!detail ? (
                          <p className="text-slate-500 dark:text-slate-400">Cargando...</p>
                        ) : (
                          <>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Alta: {dateFormat.format(new Date(detail.createdAt))} · plan {detail.plan} · id {detail.id}
                            </p>
                            <div>
                              <p className="mb-1 font-medium text-slate-700 dark:text-slate-300">Usuarios</p>
                              <ul className="space-y-0.5">
                                {detail.members.map((member) => (
                                  <li key={member.id} className="text-slate-700 dark:text-slate-300">
                                    {member.name.trim() || "—"} · {member.email} · {member.role}
                                    {member.allowedArea ? ` · ${member.allowedArea}` : ""}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="mb-1 font-medium text-slate-700 dark:text-slate-300">Dispositivos</p>
                              {detail.deviceList.length === 0 ? (
                                <p className="text-slate-500 dark:text-slate-400">Ninguno.</p>
                              ) : (
                                <ul className="space-y-0.5">
                                  {detail.deviceList.map((device) => (
                                    <li key={device.id} className="text-slate-700 dark:text-slate-300">
                                      {device.imei} · {device.model} · {device.status}
                                      {device.lastSeenAt ? ` · visto ${dateTimeFormat.format(new Date(device.lastSeenAt))}` : ""}
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
                                  placeholder="IMEI del dispositivo para este cliente"
                                  aria-label="IMEI del dispositivo"
                                  className={INPUT}
                                />
                                <select
                                  value={claimModel}
                                  onChange={(e) => setClaimModel(e.target.value)}
                                  aria-label="Modelo"
                                  className="field-input rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                                >
                                  {DEVICE_MODELS.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                                <button type="submit" disabled={claiming} className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60">
                                  {claiming ? "Agregando..." : "Agregar dispositivo"}
                                </button>
                              </form>
                              {claimMessage && (
                                <p className={`mt-1 text-xs ${claimMessage.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                  {claimMessage.text}
                                </p>
                              )}
                            </div>
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
