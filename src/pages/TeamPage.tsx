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
  updateTeamMemberEmail,
  updateTeamMemberPassword,
  updateTeamMemberProducts,
  updateTeamMemberRole,
} from "../lib/api";
import type { Product, TeamMember, TeamRole } from "../lib/types";

const ROLE_LABEL: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  viewer: "Usuario",
};

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
    onChange(
      selected.includes(key)
        ? selected.filter((k) => k !== key)
        : [...selected, key],
    );
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {products.map((product) => (
        <label
          key={product.key}
          className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300"
        >
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

  const [editingEmail, setEditingEmail] = useState(false);
  const [email, setEmail] = useState(member.email);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

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
    setEmail(member.email);
  }, [member.email]);

  const isSelf = member.id === currentUser?.userId;
  const canChangeRole = member.role !== "owner" && !isSelf;
  // The backend mirrors this: anyone can edit their own account regardless of role,
  // but only the owner themself can touch their email/password/existence from here.
  const canManageAccount = member.role !== "owner" || isSelf;
  const canDelete = member.role !== "owner" && !isSelf;

  async function handleRoleChange(role: TeamRole) {
    if (role !== "admin" && role !== "viewer") return;
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
    if (!confirm(`¿Eliminar a "${member.email}" del equipo? No va a poder volver a entrar.`)) return;
    setDeleting(true);
    try {
      await deleteTeamMember(member.id);
      onChanged();
    } finally {
      setDeleting(false);
    }
  }

  const productsChanged =
    JSON.stringify([...productKeys].sort()) !==
    JSON.stringify([...member.productKeys].sort());

  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editingEmail ? (
            <div className="flex items-center gap-1.5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
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
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{member.email}</p>
              {canManageAccount && (
                <button
                  onClick={() => setEditingEmail(true)}
                  className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10"
                  aria-label="Editar email"
                >
                  <Pencil className="h-3.5 w-3.5" />
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

      {member.role === "viewer" && (
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
          <p className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
            Acceso a cards
          </p>
          <ProductCheckboxes
            products={products}
            selected={productKeys}
            onChange={setProductKeys}
          />
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
            <span className="ml-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Guardado ✓
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [newMemberProducts, setNewMemberProducts] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function refetch() {
    const [membersList, productsList] = await Promise.all([
      listTeamMembers(),
      listProducts(),
    ]);
    setMembers(membersList);
    setProducts(productsList);
    setNewMemberProducts((current) =>
      current.length === 0 ? productsList.map((p) => p.key) : current,
    );
  }

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await createTeamMember({
        email,
        password,
        role,
        productKeys: role === "viewer" ? newMemberProducts : undefined,
      });
      setEmail("");
      setPassword("");
      setRole("viewer");
      await refetch();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "No se pudo invitar al usuario",
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
        Cargando...
      </div>
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
          Quién puede entrar a tu cuenta de OneSystec, y a qué cards tiene
          acceso cada uno.
        </p>

        <div className="max-w-3xl space-y-6">
          <Panel title="Invitar a alguien">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
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
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "admin" | "viewer")
                  }
                  className="field-input rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="viewer">Usuario</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {role === "viewer" && (
                <div>
                  <p className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
                    Acceso a cards
                  </p>
                  <ProductCheckboxes
                    products={products}
                    selected={newMemberProducts}
                    onChange={setNewMemberProducts}
                  />
                </div>
              )}

              {createError && (
                <p className="text-sm text-red-600">{createError}</p>
              )}

              <button
                type="submit"
                disabled={creating}
                className="brand-button rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {creating ? "Invitando..." : "Invitar"}
              </button>
            </form>
          </Panel>

          <Panel title={`Miembros (${members.length})`}>
            <div className="space-y-2">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  products={products}
                  onChanged={refetch}
                />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
