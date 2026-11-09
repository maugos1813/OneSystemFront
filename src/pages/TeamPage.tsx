import { ArrowLeft, ImagePlus, KeyRound, Pencil, ShieldCheck, ShieldOff, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Panel } from "../components/analytics/Panel";
import { FleetVehiclesDialog } from "../components/FleetVehiclesDialog";
import { PasswordField } from "../components/PasswordField";
import { LogoUpload } from "../components/LogoUpload";
import { LanguageSelect } from "../components/LanguageSelect";
import { ModulesPicker } from "../components/ModulesPicker";
import { useAuth } from "../context/AuthContext";
import { useT, type MessageKey } from "../i18n";
import {
  ApiError,
  resetMemberTotp,
  createTeamMember,
  deleteTeamMember,
  listProducts,
  listTeamMembers,
  updateTeamMemberArea,
  updateTeamMemberEmail,
  updateTeamMemberLogo,
  updateTeamMemberLanguage,
  updateTeamMemberModules,
  updateTeamMemberName,
  updateTeamMemberPassword,
  updateTeamMemberProducts,
  updateTeamMemberRole,
  listVehicles,
} from "../lib/api";
import { FleetGroupSelect } from "../components/FleetGroupSelect";
import { useFleetGroups } from "../lib/useFleetGroups";
import { fileToLogoVariants, LOGO_ACCEPT } from "../lib/logoImage";
import { MODULE_INFO, MODULE_TEMPLATES, matchingTemplate, visibleModules, type ModuleKey } from "../lib/modules";
import type { CurrentUser, Product, TeamMember, TeamRole, Vehicle } from "../lib/types";

const ROLE_LABEL: Record<TeamRole, MessageKey> = {
  // The account holder is the client itself; its people are its team.
  owner: "role.owner",
  admin: "role.admin",
  manager: "role.manager",
  viewer: "role.viewer",
};

/** What each role can do, as the backend enforces it (owner/admin/manager gates on each route). */
const ROLE_HELP: Record<"admin" | "manager" | "viewer", MessageKey> = {
  viewer: "team.help.viewer",
  manager: "team.help.manager",
  admin: "team.help.admin",
};

/** Mirrors the backend's canManageOther() — deliberately excludes self-service, since
 * a restricted user editing their own área/products would be privilege escalation. */
function canManageOther(currentUser: CurrentUser | null, member: TeamMember): boolean {
  if (!currentUser) return false;
  if (currentUser.role === "owner" || currentUser.role === "admin") return member.role !== "owner";
  if (currentUser.role === "manager") return member.parentUserId === currentUser.userId;
  return false;
}

export function ProductCheckboxes({
  products,
  selected,
  onChange,
}: {
  products: Product[];
  selected: string[];
  onChange: (keys: string[]) => void;
}) {
  function toggle(key: string) {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {products.map((product) => (
        <label key={product.key} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={selected.includes(product.key)}
            onChange={() => toggle(product.key)}
            className="brand-range h-4 w-4"
          />
          {product.name}
        </label>
      ))}
    </div>
  );
}

function AreaSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT();
  const groups = useFleetGroups();
  return (
    <FleetGroupSelect
      value={value}
      onChange={onChange}
      groups={groups}
      emptyLabel={t("settings.allFleets")}
      className="field-input rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
    />
  );
}

function MemberRow({
  member,
  products,
  vehicles,
  onChanged,
  onVehiclesChanged,
}: {
  member: TeamMember;
  products: Product[];
  /** The account's vehicles (only loaded for owner/admin): what a fleet's vehicles are chosen from. */
  vehicles: Vehicle[];
  onChanged: () => void;
  onVehiclesChanged: () => void;
}) {
  const t = useT();
  const { currentUser } = useAuth();
  const [productKeys, setProductKeys] = useState(member.productKeys);
  const [savingProducts, setSavingProducts] = useState(false);
  const [savedProducts, setSavedProducts] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [choosingVehicles, setChoosingVehicles] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(member.name);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [editingEmail, setEditingEmail] = useState(false);
  const [email, setEmail] = useState(member.email);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [editingArea, setEditingArea] = useState(false);
  const [area, setArea] = useState(member.allowedArea ?? "");
  const [savingArea, setSavingArea] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);

  const [editingPassword, setEditingPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [modules, setModules] = useState<ModuleKey[]>(member.modules);
  const [savingModules, setSavingModules] = useState(false);
  const [savedModules, setSavedModules] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [savingLanguage, setSavingLanguage] = useState(false);

  // `member` is a fresh object after each refetch (e.g. right after a save), but this
  // row never unmounts (same `key`) — resync local edits with the server's version.
  useEffect(() => {
    setProductKeys(member.productKeys);
  }, [member.productKeys]);

  useEffect(() => {
    setModules(member.modules);
  }, [member.modules]);

  useEffect(() => {
    setName(member.name);
  }, [member.name]);

  useEffect(() => {
    setEmail(member.email);
  }, [member.email]);

  useEffect(() => {
    setArea(member.allowedArea ?? "");
  }, [member.allowedArea]);

  const isSelf = member.id === currentUser?.userId;
  const canChangeRole = (currentUser?.role === "owner" || currentUser?.role === "admin") && member.role !== "owner" && !isSelf;
  // The backend mirrors this: anyone can edit their own name/email/password regardless
  // of role, but área/products/delete never allow self-service (see canManageOther).
  const canManageAccount = isSelf || canManageOther(currentUser, member);
  const canManageOtherOnly = canManageOther(currentUser, member);
  const canDelete = canManageOtherOnly && !isSelf;
  const showProducts = member.role === "viewer" || member.role === "manager";

  async function handleRoleChange(role: TeamRole) {
    if (role !== "admin" && role !== "manager" && role !== "viewer") return;
    setSavingRole(true);
    try {
      await updateTeamMemberRole(member.id, role);
      onChanged();
    } finally {
      setSavingRole(false);
    }
  }

  async function handleSaveProducts() {
    setSavingProducts(true);
    try {
      await updateTeamMemberProducts(member.id, productKeys);
      onChanged();
      setSavedProducts(true);
      setTimeout(() => setSavedProducts(false), 2000);
    } finally {
      setSavingProducts(false);
    }
  }

  async function handleSaveName() {
    setSavingName(true);
    setNameError(null);
    try {
      await updateTeamMemberName(member.id, name);
      setEditingName(false);
      onChanged();
    } catch (err) {
      setNameError(err instanceof ApiError ? err.message : t("team.err.name"));
    } finally {
      setSavingName(false);
    }
  }

  async function handleSaveEmail() {
    setSavingEmail(true);
    setEmailError(null);
    try {
      await updateTeamMemberEmail(member.id, email);
      setEditingEmail(false);
      onChanged();
    } catch (err) {
      setEmailError(err instanceof ApiError ? err.message : t("team.err.email"));
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleSaveArea() {
    setSavingArea(true);
    setAreaError(null);
    try {
      await updateTeamMemberArea(member.id, area || null);
      setEditingArea(false);
      onChanged();
    } catch (err) {
      setAreaError(err instanceof ApiError ? err.message : t("team.err.fleet"));
    } finally {
      setSavingArea(false);
    }
  }

  async function handleSavePassword() {
    setSavingPassword(true);
    setPasswordError(null);
    try {
      await updateTeamMemberPassword(member.id, password);
      setPassword("");
      setEditingPassword(false);
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2000);
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : t("team.err.password"));
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLanguage(language: "es" | "it") {
    setSavingLanguage(true);
    try {
      await updateTeamMemberLanguage(member.id, language);
      onChanged();
    } finally {
      setSavingLanguage(false);
    }
  }

  async function handleSaveModules() {
    setSavingModules(true);
    try {
      await updateTeamMemberModules(member.id, modules);
      setSavedModules(true);
      setTimeout(() => setSavedModules(false), 2000);
      onChanged();
    } finally {
      setSavingModules(false);
    }
  }

  async function handleLogo(file: File | null | undefined, remove = false) {
    if (!remove && !file) return;
    setSavingLogo(true);
    setLogoError(null);
    try {
      if (remove) {
        await updateTeamMemberLogo(member.id, null);
      } else {
        // The small copy is what the map draws on the plates of this account's fleet.
        const { logo, tag } = await fileToLogoVariants(file as File);
        await updateTeamMemberLogo(member.id, logo, tag);
      }
      onChanged();
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : t("team.err.logo"));
    } finally {
      setSavingLogo(false);
    }
  }

  // A lost phone: whoever manages this member removes their authenticator (the owner for an admin; nobody for the owner, OneSystec does).
  const canResetTotp = member.totpEnabled && canManageOtherOnly && !isSelf && (member.role !== "admin" || currentUser?.role === "owner");
  const [resettingTotp, setResettingTotp] = useState(false);

  async function handleResetTotp() {
    if (!confirm(t("team.confirmReset", { who: member.name || member.email }))) return;
    setResettingTotp(true);
    try {
      await resetMemberTotp(member.id);
      onChanged();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : t("team.err.reset"));
    } finally {
      setResettingTotp(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t("team.confirmDelete", { who: member.name || member.email }))) return;
    setDeleting(true);
    try {
      await deleteTeamMember(member.id);
      onChanged();
    } finally {
      setDeleting(false);
    }
  }

  const modulesChanged = JSON.stringify([...modules].sort()) !== JSON.stringify([...member.modules].sort());
  const productsChanged =
    JSON.stringify([...productKeys].sort()) !== JSON.stringify([...member.productKeys].sort());

  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white p-0.5 ring-1 ring-slate-200 dark:ring-white/10">
            {member.logo ? (
              <img src={member.logo} alt={member.name || member.email} className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="brand-gradient flex h-full w-full items-center justify-center rounded-lg text-sm font-bold text-white">
                {(member.name || member.email).trim().charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          {canManageOtherOnly && (
            <span className="flex gap-0.5">
              <label
                className={`cursor-pointer rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 ${savingLogo ? "pointer-events-none opacity-50" : ""}`}
                title={member.logo ? t("team.logoChange") : t("team.logoUpload")}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept={LOGO_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    void handleLogo(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {member.logo && (
                <button
                  onClick={() => void handleLogo(null, true)}
                  disabled={savingLogo}
                  className="rounded-md p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-red-500/10"
                  title={t("team.logoRemove")}
                  aria-label={t("team.logoRemove")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder={t("team.name")}
                className="field-input min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="brand-button shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-50"
              >
                {t("team.save")}
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setName(member.name);
                  setNameError(null);
                }}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10"
                aria-label={t("team.cancel")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                {member.name || member.email}
              </p>
              {canManageAccount && (
                <button
                  onClick={() => setEditingName(true)}
                  className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10"
                  aria-label={t("team.editName")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {nameError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{nameError}</p>}

          {editingEmail ? (
            <div className="mt-1 flex items-center gap-1.5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
              <button
                onClick={handleSaveEmail}
                disabled={savingEmail}
                className="brand-button shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-50"
              >
                {t("team.save")}
              </button>
              <button
                onClick={() => {
                  setEditingEmail(false);
                  setEmail(member.email);
                  setEmailError(null);
                }}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10"
                aria-label={t("team.cancel")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{member.email}</p>
              {canManageAccount && (
                <button
                  onClick={() => setEditingEmail(true)}
                  className="shrink-0 rounded-lg p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10"
                  aria-label={t("team.editEmail")}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          {emailError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{emailError}</p>}
          {logoError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{logoError}</p>}
          {isSelf && <p className="text-xs text-slate-400 dark:text-slate-500">{t("team.you")}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {canChangeRole ? (
            <select
              value={member.role}
              disabled={savingRole}
              onChange={(e) => handleRoleChange(e.target.value as TeamRole)}
              className="field-input rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="admin">{t("role.admin")}</option>
              <option value="manager">{t("role.manager")}</option>
              <option value="viewer">{t("role.viewer")}</option>
            </select>
          ) : (
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              {t(ROLE_LABEL[member.role])}
            </span>
          )}

          {member.totpEnabled && (
            <span title={t("team.twoStepOn")} className="text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" aria-label={t("team.twoStepOn")} />
            </span>
          )}

          {canResetTotp && (
            <button
              onClick={handleResetTotp}
              disabled={resettingTotp}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
              aria-label={t("team.twoStepReset")}
              title={t("team.twoStepResetTitle")}
            >
              <ShieldOff className="h-4 w-4" />
            </button>
          )}

          {canManageAccount && (
            <button
              onClick={() => setEditingPassword((v) => !v)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10"
              aria-label={t("team.changePassword")}
              title={t("team.changePassword")}
            >
              <KeyRound className="h-4 w-4" />
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              aria-label={t("team.delete")}
              title={t("team.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {editingPassword && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-3 dark:border-white/10">
          <PasswordField
            required
            minLength={8}
            placeholder={t("team.newPassword")}
            value={password}
            onChange={setPassword}
            autoFocus
            className="min-w-0 flex-1"
            inputClassName="rounded-lg px-2 py-1"
          />
          <button
            onClick={handleSavePassword}
            disabled={savingPassword || password.length < 8}
            className="brand-button shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-50"
          >
            {t("team.save")}
          </button>
          <button
            onClick={() => {
              setEditingPassword(false);
              setPassword("");
              setPasswordError(null);
            }}
            className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10"
            aria-label={t("team.cancel")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {passwordError && <p className="w-full text-xs text-red-600 dark:text-red-400">{passwordError}</p>}
        </div>
      )}
      {passwordSaved && (
        <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">{t("team.passwordUpdated")}</p>
      )}

      {showProducts && (
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">{t("team.fleet")}</p>
            {canManageOtherOnly && !editingArea && (
              <button
                onClick={() => setEditingArea(true)}
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                {t("team.change")}
              </button>
            )}
          </div>
          {editingArea ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <AreaSelect value={area} onChange={setArea} />
              <button
                onClick={handleSaveArea}
                disabled={savingArea}
                className="brand-button shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-50"
              >
                {t("team.save")}
              </button>
              <button
                onClick={() => {
                  setEditingArea(false);
                  setArea(member.allowedArea ?? "");
                  setAreaError(null);
                }}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10"
                aria-label={t("team.cancel")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {areaError && <p className="w-full text-xs text-red-600 dark:text-red-400">{areaError}</p>}
            </div>
          ) : member.allowedArea ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                {t("team.onlyArea", { area: member.allowedArea })}
              </span>
              {canManageOtherOnly && vehicles.length > 0 && (
                <>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t("team.vehicleCount", { count: vehicles.filter((v) => v.fleetGroup === member.allowedArea).length })}
                  </span>
                  <button onClick={() => setChoosingVehicles(true)} className="brand-button rounded-lg px-2.5 py-1 text-xs font-medium">
                    {t("team.chooseVehicles")}
                  </button>
                </>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">{t("settings.allFleets")}</span>
          )}
        </div>
      )}

      {showProducts && (
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
          <p className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
            {t("team.cardsAccess")}
          </p>
          {canManageOtherOnly ? (
            <>
              <ProductCheckboxes products={products} selected={productKeys} onChange={setProductKeys} />
              {productsChanged && (
                <button
                  onClick={handleSaveProducts}
                  disabled={savingProducts}
                  className="brand-button mt-3 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {savingProducts ? t("team.saving") : t("team.saveAccess")}
                </button>
              )}
              {savedProducts && (
                <span className="ml-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">{t("settings.saved")}</span>
              )}
            </>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {member.productKeys.length === 0 && (
                <span className="text-xs text-slate-400 dark:text-slate-500">{t("settings.none")}</span>
              )}
              {products
                .filter((p) => member.productKeys.includes(p.key))
                .map((p) => (
                  <span
                    key={p.key}
                    className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300"
                  >
                    {p.name}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      {canManageOtherOnly && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-white/10">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
            {t("team.language")} <span className="font-normal normal-case">{t("team.languageHint")}</span>
          </p>
          <LanguageSelect value={member.language ?? "it"} onChange={(l) => void handleLanguage(l)} disabled={savingLanguage} />
        </div>
      )}

      {showProducts && (
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
          <p className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
            {t("team.oneTrackSections")}
          </p>
          {canManageOtherOnly ? (
            <>
              <ModulesPicker
                selected={modules}
                onChange={setModules}
                available={currentUser?.role === "manager" ? currentUser.modules : undefined}
              />
              {modulesChanged && (
                <button
                  onClick={handleSaveModules}
                  disabled={savingModules}
                  className="brand-button mt-3 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {savingModules ? t("team.saving") : t("team.saveSections")}
                </button>
              )}
              {savedModules && <span className="ml-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">{t("settings.saved")}</span>}
            </>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {member.modules.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-500">{t("settings.none")}</span>}
              {visibleModules(member.modules).map((key) => (
                <span key={key} className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  {t(MODULE_INFO[key].label)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {choosingVehicles && member.allowedArea && (
        <FleetVehiclesDialog
          fleet={member.allowedArea}
          vehicles={vehicles}
          onClose={() => setChoosingVehicles(false)}
          onSaved={onVehiclesChanged}
        />
      )}
    </div>
  );
}

/** `embedded`: inside the OneTrack layout, which has its own bars (no "back to the portal" header). */
export function TeamPage({ embedded = false }: { embedded?: boolean }) {
  const t = useT();
  const { currentUser } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  // The account's vehicles, for owner/admin to choose which ones each fleet has.
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const isManager = currentUser?.role === "manager";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "viewer">("viewer");
  const [area, setArea] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [logoTag, setLogoTag] = useState<string | null>(null);
  const [newModules, setNewModules] = useState<ModuleKey[]>([...MODULE_TEMPLATES.estandar]);
  const [newLanguage, setNewLanguage] = useState<"es" | "it">("it");
  const [newMemberProducts, setNewMemberProducts] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function refetch() {
    const canChoose = (currentUser?.role === "owner" || currentUser?.role === "admin") && !currentUser.allowedArea && !currentUser.viewingAs;
    const [membersList, productsList, vehiclesList] = await Promise.all([
      listTeamMembers(),
      listProducts(),
      canChoose ? listVehicles().catch(() => [] as Vehicle[]) : Promise.resolve([] as Vehicle[]),
    ]);
    setMembers(membersList);
    setProducts(productsList);
    setVehicles(vehiclesList);
    setNewMemberProducts((current) => (current.length === 0 ? productsList.map((p) => p.key) : current));
  }

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, []);

  // A manager can only ever grant its own área — lock the field to that once known.
  useEffect(() => {
    if (isManager && currentUser?.allowedArea) setArea(currentUser.allowedArea);
  }, [isManager, currentUser?.allowedArea]);

  const effectiveRole = isManager ? "viewer" : role;
  const showProductsSection = effectiveRole === "viewer" || effectiveRole === "manager";
  const areaLocked = isManager && !!currentUser?.allowedArea;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await createTeamMember({
        name,
        email,
        password,
        role: effectiveRole,
        allowedArea: area || null,
        ...(logo ? { logo, logoTag } : {}),
        language: newLanguage,
        ...(showProductsSection ? { modules: newModules } : {}),
        productKeys: showProductsSection ? newMemberProducts : undefined,
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("viewer");
      setLogo(null);
      setNewModules([...MODULE_TEMPLATES.estandar]);
      setNewLanguage("it");
      if (!areaLocked) setArea("");
      await refetch();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t("team.err.invite"));
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">{t("common.loading")}</div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] dark:bg-[#0a0e1a]">
      {!embedded && (
        <header className="border-b border-violet-100 bg-white px-4 py-4 sm:px-8 dark:border-white/5 dark:bg-[#0d1220]">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("team.backToPortal")}
          </Link>
        </header>
      )}

      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("team.title")}</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          {isManager ? t("team.introManager") : t("team.intro")}
        </p>

        <div className="space-y-6">
          <Panel title={isManager ? t("team.createSub") : t("team.invite")}>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  required
                  placeholder={t("team.name")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field-input min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <input
                  type="email"
                  required
                  placeholder={t("team.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <PasswordField
                  required
                  minLength={8}
                  placeholder={t("team.passwordPlaceholder")}
                  value={password}
                  onChange={setPassword}
                  className="min-w-0 flex-1"
                  inputClassName="rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {!isManager && (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "admin" | "manager" | "viewer")}
                    className="field-input rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="viewer">{t("role.viewer")}</option>
                    <option value="manager">{t("team.roleManagerOption")}</option>
                    <option value="admin">{t("role.admin")}</option>
                  </select>
                )}

                {areaLocked ? (
                  <p className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                    {t("team.fleetLocked", { area })}
                  </p>
                ) : (
                  <AreaSelect value={area} onChange={setArea} />
                )}
              </div>

              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-400">
                <strong className="font-semibold text-slate-700 dark:text-slate-300">{t(ROLE_LABEL[effectiveRole])}:</strong>{" "}
                {t(ROLE_HELP[effectiveRole])}
                {" "}
                <strong className="font-semibold text-slate-700 dark:text-slate-300">{t("team.fleet")}:</strong> {t("team.fleetNote")}
              </p>

              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
                  {t("team.clientLogo")} <span className="font-normal normal-case">{t("team.clientLogoHint")}</span>
                </p>
                <LogoUpload
                  value={logo}
                  onChange={(next, tag) => {
                    setLogo(next);
                    setLogoTag(tag ?? null);
                  }}
                  name={name}
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
                  {t("team.language")} <span className="font-normal normal-case">{t("team.languageHint")}</span>
                </p>
                <LanguageSelect value={newLanguage} onChange={setNewLanguage} />
              </div>

              {showProductsSection && (
                <div>
                  <p className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
                    {t("team.oneTrackSections")}{" "}
                    <span className="font-normal normal-case">{t("team.drivingOff")}</span>
                  </p>
                  <ModulesPicker
                    selected={newModules}
                    onChange={setNewModules}
                    available={isManager ? currentUser?.modules : undefined}
                  />
                  {matchingTemplate(newModules) === "recursosHumanos" && (
                    <p className="mt-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-800 dark:bg-blue-500/10 dark:text-blue-300">
                      {t("team.hrNote")}{" "}
                      {effectiveRole === "viewer" ? t("team.hrViewer") : effectiveRole === "manager" ? t("team.hrManager") : ""}
                    </p>
                  )}
                </div>
              )}

              {showProductsSection && (
                <div>
                  <p className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
                    {t("team.cardsAccess")}
                  </p>
                  <ProductCheckboxes products={products} selected={newMemberProducts} onChange={setNewMemberProducts} />
                </div>
              )}

              {createError && <p className="text-sm text-red-600">{createError}</p>}

              <button
                type="submit"
                disabled={creating}
                className="brand-button rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {creating ? t("team.creating") : isManager ? t("team.createSubButton") : t("team.inviteButton")}
              </button>
            </form>
          </Panel>

          {(() => {
            // The account holder is the client; the rest are its team, shown under it.
            const owners = members.filter((m) => m.role === "owner");
            const team = members.filter((m) => m.role !== "owner");
            const row = (member: TeamMember) => (
              <MemberRow key={member.id} member={member} products={products} vehicles={vehicles} onChanged={refetch} onVehiclesChanged={refetch} />
            );
            if (owners.length === 0) {
              return (
                <Panel title={t("team.members", { count: members.length })}>
                  <div className="space-y-2">{members.map(row)}</div>
                </Panel>
              );
            }
            return (
              <Panel title={t("team.clientAndTeam", { count: team.length })}>
                <div className="space-y-2">{owners.slice(0, 1).map(row)}</div>
                <p className="mt-4 mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">{t("team.title")}</p>
                {team.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t("team.noTeam")}</p>
                ) : (
                  <div className="space-y-2 border-l-2 border-violet-100 pl-3 dark:border-white/10">{[...owners.slice(1), ...team].map(row)}</div>
                )}
              </Panel>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
