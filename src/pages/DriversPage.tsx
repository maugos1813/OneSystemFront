import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useT } from "../i18n";
import {
  assignDriverBeacon,
  assignDriverBeaconByMac,
  listDetectedBeacons,
  listDriverBeacons,
  removeDriverBeacon,
  renameDriverBeacon,
} from "../lib/api";
import { trackGlow } from "../lib/glow";
import { formatRelativeTime } from "../lib/relativeTime";
import type { DetectedBeacon, DriverBeacon } from "../lib/types";

interface Row {
  beaconId: string;
  registeredId: string | null;
  driverName: string | null;
  detected: DetectedBeacon | null;
}

const kindOf = (beaconId: string): string => (beaconId.startsWith("ibeacon:") ? "iBeacon" : "Eddystone");
const idOf = (beaconId: string): string => beaconId.slice(beaconId.indexOf(":") + 1);

/** The MAC of an EYE Beacon still on its factory identity (zero namespace, MAC as instance); null for any other beacon. */
function factoryMac(beaconId: string): string | null {
  const m = /^eddystone:0{20}-([0-9a-f]{12})$/.exec(beaconId);
  return m ? m[1]!.toUpperCase().replace(/(..)(?=.)/g, "$1:") : null;
}

function NameCell({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const [name, setName] = useState(row.driverName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = name.trim() !== (row.driverName ?? "");

  async function save() {
    if (!name.trim() || !changed) return;
    setSaving(true);
    setError(null);
    try {
      if (row.registeredId) await renameDriverBeacon(row.registeredId, name.trim());
      else await assignDriverBeacon(row.beaconId, name.trim());
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Nombre del chofer"
          maxLength={100}
          className="field-input w-44 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        {changed && name.trim() && (
          <button
            onClick={save}
            disabled={saving}
            className="brand-button rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-50"
          >
            {row.registeredId ? "Guardar" : "Asignar"}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** Registers a beacon before any tracker has heard it, from the MAC on its label. */
function AddByMacForm({ onAdded }: { onAdded: () => void }) {
  const [mac, setMac] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await assignDriverBeaconByMac(mac, name);
      setMac("");
      setName("");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      onMouseMove={trackGlow}
      className="glow float-card rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
    >
      <p className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">Asignar baliza por MAC</p>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        La MAC está impresa en la etiqueta de la baliza (por ejemplo 7C:D9:F4:0B:39:E3). Sirve para balizas con su
        identidad de fábrica; si le cambiaste el namespace o el ID, espera a que un GPS la oiga y asígnala desde la
        lista.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <input
          required
          value={mac}
          onChange={(e) => setMac(e.target.value)}
          placeholder="7C:D9:F4:0B:39:E3"
          maxLength={17}
          className="field-input w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm sm:w-56 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del chofer"
          maxLength={100}
          className="field-input w-full flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <button
          type="submit"
          disabled={saving}
          className="brand-button rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Asignar baliza
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </form>
  );
}

export function DriversPage() {
  const t = useT();
  const [registered, setRegistered] = useState<DriverBeacon[]>([]);
  const [detected, setDetected] = useState<DetectedBeacon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function refetch() {
    Promise.all([listDriverBeacons(), listDetectedBeacons(24)])
      .then(([reg, det]) => {
        setRegistered(reg);
        setDetected(det);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudieron cargar las balizas"))
      .finally(() => setLoading(false));
  }

  useEffect(refetch, []);

  const rows = useMemo<Row[]>(() => {
    const byId = new Map<string, Row>();
    for (const d of detected) {
      byId.set(d.beaconId, {
        beaconId: d.beaconId,
        registeredId: d.registeredId,
        driverName: d.driverName,
        detected: d,
      });
    }
    for (const r of registered) {
      if (!byId.has(r.beaconId))
        byId.set(r.beaconId, { beaconId: r.beaconId, registeredId: r.id, driverName: r.driverName, detected: null });
    }
    // Unassigned ones first: they are what the admin came to name.
    return [...byId.values()].sort((a, b) => Number(!!a.driverName) - Number(!!b.driverName));
  }, [registered, detected]);

  async function handleRemove(row: Row) {
    if (!row.registeredId) return;
    if (!confirm(`¿Quitar la baliza de ${row.driverName}? Dejará de identificarse a este chofer.`)) return;
    await removeDriverBeacon(row.registeredId);
    refetch();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("nav.drivers")}</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Cada chofer lleva una baliza Bluetooth (Teltonika EYE Beacon). El GPS del vehículo la oye mientras se conduce y
        así sabemos quién iba. Con dos choferes en la cabina se muestra como probable conductor el que se oye más
        fuerte, y el otro como acompañante: es una identificación, no una prueba. Solo cuentan los momentos en que el
        vehículo se mueve, así que juntar a los choferes en una reunión no confunde nada.
      </p>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div
          onMouseMove={trackGlow}
          className="glow float-card rounded-2xl border border-white bg-white p-4 text-sm text-slate-600 shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:text-slate-300 dark:shadow-black/40"
        >
          <p className="mb-1 font-semibold text-slate-900 dark:text-white">Cómo agregar la baliza de un chofer</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>El GPS del vehículo debe tener Bluetooth activado y escanear balizas (Beacon Detection: All).</li>
            <li>
              Asígnala con su MAC (abajo) o sube con ella a ese vehículo y deja pasar unos minutos: aparece en la lista
              como «sin asignar».
            </li>
            <li>Escribe el nombre del chofer y pulsa Asignar.</li>
          </ol>
        </div>

        <AddByMacForm onAdded={refetch} />
      </div>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 dark:bg-[#111729] dark:text-slate-400">
          Ningún GPS ha oído todavía una baliza en las últimas 24 horas.
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <table className="w-full text-left text-sm">
            <thead className="text-xs tracking-wide text-slate-400 uppercase dark:text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Chofer</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Identificador</th>
                <th className="px-4 py-3 font-semibold">MAC</th>
                <th className="px-4 py-3 font-semibold">Oída por</th>
                <th className="px-4 py-3 font-semibold">Última vez</th>
                <th className="px-4 py-3 font-semibold">Señal media</th>
                <th className="px-4 py-3 font-semibold">Detecciones</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {rows.map((row) => (
                <tr key={row.beaconId}>
                  <td className="px-4 py-3">
                    <NameCell key={`${row.beaconId}:${row.driverName}`} row={row} onSaved={refetch} />
                    {!row.driverName && (
                      <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                        sin asignar
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {kindOf(row.beaconId)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs break-all text-slate-600 dark:text-slate-300">
                    {idOf(row.beaconId)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {factoryMac(row.beaconId) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {row.detected ? (
                      <>
                        {row.detected.vehicle.plate ?? row.detected.vehicle.name}
                        {row.detected.vehicle.plate && row.detected.vehicle.name !== row.detected.vehicle.plate && (
                          <span className="block text-xs text-slate-400 dark:text-slate-500">
                            {row.detected.vehicle.name}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Sin señal en 24 h</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {row.detected ? formatRelativeTime(row.detected.lastSeen, t) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {row.detected?.avgRssi != null ? `${row.detected.avgRssi} dBm` : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {row.detected ? row.detected.sightings : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.registeredId && (
                      <button
                        onClick={() => handleRemove(row)}
                        aria-label="Quitar baliza"
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
