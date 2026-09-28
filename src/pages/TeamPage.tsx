import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Panel } from "../components/analytics/Panel";
import { useAuth } from "../context/AuthContext";
import {
  createTeamMember,
  listProducts,
  listTeamMembers,
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

  // `member` is a fresh object after each refetch (e.g. right after a save), but this
  // row never unmounts (same `key`) — resync local edits with the server's version.
  useEffect(() => {
    setProductKeys(member.productKeys);
  }, [member.productKeys]);

  const isSelf = member.id === currentUser?.userId;
  const canChangeRole = member.role !== "owner" && !isSelf;

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

  const productsChanged =
    JSON.stringify([...productKeys].sort()) !==
    JSON.stringify([...member.productKeys].sort());

  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
            {member.email}
          </p>
          {isSelf && <p className="text-xs text-slate-400 dark:text-slate-500">Vos</p>}
        </div>

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
      </div>

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
