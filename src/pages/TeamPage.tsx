import { ArrowLeft, KeyRound, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Panel } from "../components/analytics/Panel";
import { useAuth } from "../context/AuthContext";
import {
  ApiError,
  createTeamMember,
  deleteTeamMember,
  listProducts,
  listTeamMembers,
  updateTeamMemberArea,
  updateTeamMemberEmail,
  updateTeamMemberName,
  updateTeamMemberPassword,
  updateTeamMemberProducts,
  updateTeamMemberRole,
} from "../lib/api";
import { AREA_OPTIONS } from "../lib/areaFilter";
import type { CurrentUser, Product, TeamMember, TeamRole } from "../lib/types";

const ROLE_LABEL: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  viewer: "Usuario",
};

/** Mirrors the backend's canManageOther() — deliberately excludes self-service, since
 * a restricted user editing their own área/products would be privilege escalation. */
function canManageOther(currentUser: CurrentUser | null, member: TeamMember): boolean {
  if (!currentUser) return false;
  if (currentUser.role === "owner" || currentUser.role === "admin") return member.role !== "owner";
  if (currentUser.role === "manager") return member.parentUserId === currentUser.userId;
  return false;
}

function ProductCheckboxes({
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
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="field-input rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
    >
      <option value="">Todas las áreas</option>
      {AREA_OPTIONS.map((area) => (
        <option key={area} value={area}>
          {area}
        </option>
      ))}
    </select>
  );
}

function MemberRow({
  member,
  products,
  onChanged,
}: {
  member: TeamMember;
  products: Product[];
  onChanged: () => void;
}) {
  const { currentUser } = useAuth();
  const [productKeys, setProductKeys] = useState(member.productKeys);
  const [savingProducts, setSavingProducts] = useState(false);
  const [savedProducts, setSavedProducts] = useState(false);
  const [savingRole, setSavingRole] = useState(false);

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

  // `member` is a fresh object after each refetch (e.g. right after a save), but this
  // row never unmounts (same `key`) — resync local edits with the server's version.
  useEffect(() => {
    setProductKeys(member.productKeys);
  }, [member.productKeys]);

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
      setNameError(err instanceof ApiError ? err.message : "No se pudo actualizar el nombre");
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
      setEmailError(err instanceof ApiError ? err.message : "No se pudo actualizar el email");
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
      setAreaError(err instanceof ApiError ? err.message : "No se pudo actualizar el área");
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
      setPasswordError(err instanceof ApiError ? err.message : "No se pudo actualizar la contraseña");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar a "${member.name || member.email}" del equipo? No va a poder volver a entrar.`)) return;
    setDeleting(true);
    try {
      await deleteTeamMember(member.id);
      onChanged();
    } finally {
      setDeleting(false);
    }
  }

  const productsChanged =
    JSON.stringify([...productKeys].sort()) !== JSON.stringify([...member.productKeys].sort());

  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="Nombre"
                className="field-input min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="brand-button shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-50"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setName(member.name);
                  setNameError(null);
                }}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10"
                aria-label="Cancelar"
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
                  aria-label="Editar nombre"
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
                Guardar
              </button>
              <button
                onClick={() => {
                  setEditingEmail(false);
                  setEmail(member.email);
                  setEmailError(null);
                }}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10"
                aria-label="Cancelar"
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
                  aria-label="Editar email"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          {emailError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{emailError}</p>}
          {isSelf && <p className="text-xs text-slate-400 dark:text-slate-500">Vos</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {canChangeRole ? (
            <select
              value={member.role}
              disabled={savingRole}
              onChange={(e) => handleRoleChange(e.target.value as TeamRole)}
              className="field-input rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="viewer">Usuario</option>
            </select>
          ) : (
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              {ROLE_LABEL[member.role]}
            </span>
          )}

          {canManageAccount && (
            <button
              onClick={() => setEditingPassword((v) => !v)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10"
              aria-label="Cambiar contraseña"
              title="Cambiar contraseña"
            >
              <KeyRound className="h-4 w-4" />
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              aria-label="Eliminar"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {editingPassword && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-3 dark:border-white/10">
          <input
            type="password"
            required
            minLength={8}
            placeholder="Nueva contraseña (mínimo 8 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="field-input min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <button
            onClick={handleSavePassword}
            disabled={savingPassword || password.length < 8}
            className="brand-button shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            onClick={() => {
              setEditingPassword(false);
              setPassword("");
              setPasswordError(null);
            }}
            className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10"
            aria-label="Cancelar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {passwordError && <p className="w-full text-xs text-red-600 dark:text-red-400">{passwordError}</p>}
        </div>
      )}
      {passwordSaved && (
        <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">Contraseña actualizada ✓</p>
      )}

      {showProducts && (
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">Área</p>
            {canManageOtherOnly && !editingArea && (
              <button
                onClick={() => setEditingArea(true)}
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                Cambiar
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
                Guardar
              </button>
              <button
                onClick={() => {
                  setEditingArea(false);
                  setArea(member.allowedArea ?? "");
                  setAreaError(null);
                }}
                className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10"
                aria-label="Cancelar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {areaError && <p className="w-full text-xs text-red-600 dark:text-red-400">{areaError}</p>}
            </div>
          ) : member.allowedArea ? (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
              Solo {member.allowedArea}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">Todas las áreas</span>
          )}
        </div>
      )}

      {showProducts && (
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
          <p className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
            Acceso a cards
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
                  {savingProducts ? "Guardando..." : "Guardar acceso"}
                </button>
              )}
              {savedProducts && (
                <span className="ml-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">Guardado ✓</span>
              )}
            </>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {member.productKeys.length === 0 && (
                <span className="text-xs text-slate-400 dark:text-slate-500">Ninguna</span>
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
    </div>
  );
}

export function TeamPage() {
  const { currentUser } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const isManager = currentUser?.role === "manager";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "viewer">("viewer");
  const [area, setArea] = useState("");
  const [newMemberProducts, setNewMemberProducts] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function refetch() {
    const [membersList, productsList] = await Promise.all([listTeamMembers(), listProducts()]);
    setMembers(membersList);
    setProducts(productsList);
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
        productKeys: showProductsSection ? newMemberProducts : undefined,
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("viewer");
      if (!areaLocked) setArea("");
      await refetch();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "No se pudo invitar al usuario");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">Cargando...</div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f5f6fb] dark:bg-[#0a0e1a]">
      <header className="border-b border-violet-100 bg-white px-4 py-4 sm:px-8 dark:border-white/5 dark:bg-[#0d1220]">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al portal
        </Link>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Equipo</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          {isManager
            ? "Los sub-usuarios que creaste, y a qué cards/área tiene acceso cada uno."
            : "Quién puede entrar a tu cuenta de OneSystec, y a qué cards tiene acceso cada uno."}
        </p>

        <div className="max-w-3xl space-y-6">
          <Panel title={isManager ? "Crear un sub-usuario" : "Invitar a alguien"}>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  required
                  placeholder="Nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field-input min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Contraseña (mínimo 8 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {!isManager && (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "admin" | "manager" | "viewer")}
                    className="field-input rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="viewer">Usuario</option>
                    <option value="manager">Manager (puede crear sus propios sub-usuarios)</option>
                    <option value="admin">Admin</option>
                  </select>
                )}

                {areaLocked ? (
                  <p className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                    Área: <span className="ml-1 font-medium text-slate-700 dark:text-slate-300">{area}</span> (la
                    misma que la tuya)
                  </p>
                ) : (
                  <AreaSelect value={area} onChange={setArea} />
                )}
              </div>

              {showProductsSection && (
                <div>
                  <p className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
                    Acceso a cards
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
                {creating ? "Creando..." : isManager ? "Crear sub-usuario" : "Invitar"}
              </button>
            </form>
          </Panel>

          <Panel title={`Miembros (${members.length})`}>
            <div className="space-y-2">
              {members.map((member) => (
                <MemberRow key={member.id} member={member} products={products} onChanged={refetch} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
