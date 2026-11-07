import { Plus } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { FleetAdminInput, FleetDetail } from "../lib/types";
import { LogoUpload } from "./LogoUpload";
import { PasswordField } from "./PasswordField";

/** Where the fleets come from and go to: the client's own account, or (OneSystec) any client's. */
export interface FleetsApi {
  list: () => Promise<FleetDetail[]>;
  setLogo: (name: string, logo: string | null) => Promise<unknown>;
  createAdmin: (input: FleetAdminInput) => Promise<unknown>;
}

const INPUT =
  "field-input min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white";

/** The account form of a fleet: who administers it, with an email of their own. */
function AdminForm({ fleet, onCreate, onCancel }: { fleet: string; onCreate: (input: FleetAdminInput) => Promise<void>; onCancel?: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreate({ fleet, name: name.trim(), email: email.trim(), password });
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input required placeholder="Nombre de quien la administra" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
        <input required type="email" placeholder="Correo de la cuenta" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
        <PasswordField required minLength={8} placeholder="Contraseña (mínimo 8)" value={password} onChange={setPassword} className="min-w-0 flex-1" inputClassName="rounded-xl px-3 py-2" />
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="brand-button rounded-xl px-4 py-1.5 text-xs font-medium disabled:opacity-60">
          {busy ? "Creando..." : "Crear cuenta"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * The fleets (flotas) of a client: each with its picture, which opens its plates on the map (letters when it has none), and the
 * accounts that administer it, each with an email of their own. The fleets are the ones the system already knows: those of its
 * vehicles and those its accounts are limited to.
 */
export function FleetsManager({ api }: { api: FleetsApi }) {
  const [fleets, setFleets] = useState<FleetDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newFleet, setNewFleet] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .list()
      .then((rows) => {
        setFleets(rows);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudieron cargar las flotas"));
  }, [api]);

  useEffect(load, [load]);

  async function changeLogo(name: string, logo: string | null) {
    try {
      await api.setLogo(name, logo);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la imagen");
    }
  }

  async function createAdmin(input: FleetAdminInput) {
    await api.createAdmin(input);
    setAddingTo(null);
    setNewFleet(null);
    load();
  }

  if (!fleets) return <p className="text-sm text-slate-500 dark:text-slate-400">{error ?? "Cargando..."}</p>;

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {fleets.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no tiene flotas.</p>}

      {fleets.map((fleet) => (
        <div key={fleet.name} className="rounded-2xl border border-slate-200 p-3 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{fleet.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {fleet.vehicles} {fleet.vehicles === 1 ? "vehículo" : "vehículos"}
              </p>
            </div>
            <LogoUpload value={fleet.logo} onChange={(logo) => void changeLogo(fleet.name, logo)} name={fleet.name} />
          </div>

          <p className="mt-3 text-xs font-semibold tracking-wide text-slate-400 uppercase dark:text-slate-500">Administra esta flota</p>
          {fleet.admins.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Nadie todavía.</p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {fleet.admins.map((admin) => (
                <li key={admin.id} className="text-sm text-slate-700 dark:text-slate-300">
                  {admin.name.trim() || "—"} · {admin.email}
                </li>
              ))}
            </ul>
          )}
          {addingTo === fleet.name ? (
            <AdminForm fleet={fleet.name} onCreate={createAdmin} onCancel={() => setAddingTo(null)} />
          ) : (
            <button
              type="button"
              onClick={() => setAddingTo(fleet.name)}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar correo administrador
            </button>
          )}
        </div>
      ))}

      {newFleet === null ? (
        <button
          type="button"
          onClick={() => setNewFleet("")}
          className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-white/20 dark:text-slate-300 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" /> Nueva flota
        </button>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-3 dark:border-white/20">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Nueva flota con su cuenta administradora</p>
          <input
            placeholder="Nombre de la flota (por ejemplo DHL)"
            value={newFleet}
            maxLength={50}
            onChange={(e) => setNewFleet(e.target.value)}
            className={`${INPUT} w-full`}
          />
          {newFleet.trim() && <AdminForm fleet={newFleet.trim()} onCreate={createAdmin} onCancel={() => setNewFleet(null)} />}
          {!newFleet.trim() && (
            <button type="button" onClick={() => setNewFleet(null)} className="mt-2 rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
